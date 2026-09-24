//! CIDR 展开核心：纯 Rust 实现，编译为 wasm32-unknown-unknown 供浏览器使用。
//!
//! 通过 C ABI 导出：
//! - `alloc` / `dealloc`：供 JS 侧在 wasm 线性内存中分配输入/输出缓冲区
//! - `cidr_expand`：展开多行 CIDR 列表（每行 `a.b.c.d/prefix`），输出逐行 IP 文本
//!
//! JS 侧加载失败时可回退到 TypeScript 的同逻辑实现（见 src/lib/network/cidr.ts）。

use core::fmt::Write;

/// 写入目标：一段 wasm 线性内存切片 + 当前写入位置
struct Buf<'a>(&'a mut [u8], usize);

impl Write for Buf<'_> {
    fn write_str(&mut self, s: &str) -> core::fmt::Result {
        let bytes = s.as_bytes();
        if self.1 + bytes.len() > self.0.len() {
            return Err(core::fmt::Error);
        }
        self.0[self.1..self.1 + bytes.len()].copy_from_slice(bytes);
        self.1 += bytes.len();
        Ok(())
    }
}

/// 解析单条 CIDR：`a.b.c.d/prefix`，返回（起始 IP、主机数量）
fn parse_cidr(s: &str) -> Result<(u32, u64), ()> {
    let (ip_part, prefix_part) = s.split_once('/').ok_or(())?;
    let prefix: u32 = prefix_part.trim().parse().map_err(|_| ())?;
    if prefix > 32 {
        return Err(());
    }
    let mut octets = [0u8; 4];
    let mut it = ip_part.trim().split('.');
    for o in octets.iter_mut() {
        let v: u32 = it.next().ok_or(())?.parse().map_err(|_| ())?;
        if v > 255 {
            return Err(());
        }
        *o = v as u8;
    }
    if it.next().is_some() {
        return Err(());
    }
    let base = u32::from_be_bytes(octets);
    // 网络号：主机位清零
    let mask = if prefix == 0 { 0 } else { u32::MAX << (32 - prefix) };
    let start = base & mask;
    // 主机数量（prefix=0 时 2^32 超出 u32，用 u64）
    let host_bits = 32 - prefix;
    let count: u64 = if host_bits >= 32 { 1u64 << 32 } else { 1u64 << host_bits };
    Ok((start, count))
}

/// 在 wasm 线性内存中分配缓冲区（JS 侧使用）。
///
/// 说明：分配后由 JS 调用方持有指针；本工具为一次性使用场景，
/// 泄漏的内存随 wasm 实例/页面释放，不提供严格回收。
#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut u8 {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    core::mem::forget(buf);
    ptr
}

/// 展开多行 CIDR。
///
/// 参数：
/// - `input_ptr` / `input_len`：UTF-8 输入文本（每行一个 CIDR，空行忽略）
/// - `out_ptr` / `out_cap`：输出缓冲区
///
/// 返回：
/// - `>=0`：实际写入字节数
/// - `-1`：输入含非法 CIDR（JS 侧已预校验，正常不会触发）
/// - `-2`：输出空间不足（调用方可扩容后重试）
/// - `-3`：单条展开数量超过 2^20，拒绝（防滥用/卡死）
#[no_mangle]
pub extern "C" fn cidr_expand(
    input_ptr: *const u8,
    input_len: usize,
    out_ptr: *mut u8,
    out_cap: usize,
) -> i64 {
    let input = unsafe { core::slice::from_raw_parts(input_ptr, input_len) };
    let text = core::str::from_utf8(input).unwrap_or("");
    let out = unsafe { core::slice::from_raw_parts_mut(out_ptr, out_cap) };
    let mut w = Buf(out, 0);
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let (start, count) = match parse_cidr(line) {
            Ok(v) => v,
            Err(_) => return -1,
        };
        if count > (1u64 << 20) {
            return -3;
        }
        for i in 0..count {
            let ip = (start as u64 + i) as u32;
            let ip_str = [
                (ip >> 24) & 0xff,
                (ip >> 16) & 0xff,
                (ip >> 8) & 0xff,
                ip & 0xff,
            ];
            if write!(
                w,
                "{}.{}.{}.{}\n",
                ip_str[0], ip_str[1], ip_str[2], ip_str[3]
            )
            .is_err()
            {
                return -2;
            }
        }
    }
    w.1 as i64
}
