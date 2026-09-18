/** Framework-free signals between the DOM and the WebGL stage. */
export const stage = {
  ready: false,
  onReady: new Set<() => void>(),
};

export function whenStageReady(timeout = 6000) {
  return new Promise<void>((resolve) => {
    if (stage.ready) return resolve();
    const done = () => {
      stage.onReady.delete(done);
      resolve();
    };
    stage.onReady.add(done);
    window.setTimeout(done, timeout);
  });
}
