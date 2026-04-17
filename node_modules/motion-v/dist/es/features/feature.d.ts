import { MotionState } from '../state/motion-state';
import { Options } from '../types';
export declare class Feature {
    state: MotionState;
    constructor(state: MotionState);
    beforeMount(): void;
    mount(): void;
    unmount(unMountChildren?: boolean): void;
    update?(): void;
    beforeUpdate?(options: Options): void;
    beforeUnmount?(): void;
}
