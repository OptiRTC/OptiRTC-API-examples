export interface IEventListenerData<K extends keyof HTMLElementEventMap, T extends Element> {
    t: K; //type
    e: T; //element
    h: (this: T, ev: HTMLElementEventMap[K]) => any; //handler
    useCapture?: boolean;
}

//A helper to add an eventListener, that returns remove method that can be cached
//* It helps because it ensures that the same handler is used for removeEventListener
//  and you only need to cache the remove method
export const addElementEventListener = <K extends keyof HTMLElementEventMap, T extends Element>(
    d: IEventListenerData<K, T>
): () => void => {
    const {t, e, h} = d;
    if (d.useCapture !== undefined) {
        e.addEventListener(t, h, d.useCapture);
    } else {
        e.addEventListener(t, h);
    }
    //return fn to remove the handler in future
    return () => e.removeEventListener(t, h);
};
