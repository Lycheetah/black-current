// Tiny event bus: the explicit extension point instead of wrapping other modules' functions.

/** @returns {{on:(t:string,f:Function)=>()=>void, emit:(t:string,p?:any)=>void}} */
export function createEvents() {
  const map = new Map();
  return {
    on(type, fn) {
      if (!map.has(type)) map.set(type, new Set());
      map.get(type).add(fn);
      return () => map.get(type).delete(fn);
    },
    emit(type, payload) {
      const set = map.get(type);
      if (set) for (const fn of set) fn(payload);
    },
  };
}
