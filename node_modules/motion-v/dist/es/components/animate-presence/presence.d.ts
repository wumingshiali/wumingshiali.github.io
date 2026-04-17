import { AnimatePresenceProps } from './types';
export interface PresenceContext {
    initial?: boolean;
    custom?: any;
}
export declare const injectAnimatePresence: <T extends PresenceContext = PresenceContext>(fallback?: T) => T extends null ? PresenceContext : PresenceContext, provideAnimatePresence: (contextValue: PresenceContext) => PresenceContext;
export declare function useAnimatePresence(props: AnimatePresenceProps): void;
