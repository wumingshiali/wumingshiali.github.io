import { AnimatePresenceProps } from './types';
import { MotionState } from '../../state';
export declare function usePopLayout(props: AnimatePresenceProps): {
    addPopStyle: (state: MotionState, element: HTMLElement) => void;
    removePopStyle: (state: MotionState, element: HTMLElement) => void;
    styles: WeakMap<MotionState, HTMLStyleElement>;
};
