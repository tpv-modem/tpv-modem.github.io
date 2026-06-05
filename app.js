// TELEPHONOVISION Sound QR Code — shared ggwave logic
window.SM = (() => {
  let ggwave=null, instance=null, context=null, PROTOCOL=null;

  function waitForFactory(){
    return new Promise((res, rej)=>{
      let t=0;
      const tick=()=>{
        if (typeof window.ggwave_factory !== 'undefined') return res();
        if ((t+=50) > 8000) return rej(new Error('ggwave script not loaded'));
        setTimeout(tick, 50);
      };
      tick();
    });
  }
  async function init(){
    if (ggwave) return ggwave;
    await waitForFactory();
    ggwave = await window.ggwave_factory();
    PROTOCOL = ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST;
    return ggwave;
  }
  function ensureContext(){
    if (context) return context;
    // ★ サンプルレート未指定でデバイス任せ（iOSで48kHz強制すると不安定）
    context = new (window.AudioContext || window.webkitAudioContext)();
    const p = ggwave.getDefaultParameters();
    p.sampleRateInp = context.sampleRate;
    p.sampleRateOut = context.sampleRate;
    instance = ggwave.init(p);
    return context;
  }
  function convertTypedArray(src, type){
    const b = new ArrayBuffer(src.byteLength);
    new src.constructor(b).set(src);
    return new type(b);
  }
  // 任意テキスト→Web Audioで再生(直接)
  function playText(text, volume){
    ensureContext();
    if (context.state === 'suspended') context.resume();
    const wave = ggwave.encode(instance, text, PROTOCOL, volume || 15);
    const f32 = convertTypedArray(wave, Float32Array);
    const ab = context.createBuffer(1, f32.length, context.sampleRate);
    ab.getChannelData(0).set(f32);
    const src = context.createBufferSource();
    src.buffer = ab;
    src.connect(context.destination);
    src.start(0);
    return { samples: f32.length, durationSec: f32.length / context.sampleRate };
  }
  function decodeFromFloatChunk(data){
    const res = ggwave.decode(instance, convertTypedArray(new Float32Array(data), Int8Array));
    if (!res || res.length===0) return null;
    return new TextDecoder('utf-8').decode(res);
  }
  return {
    init, ensureContext, convertTypedArray, playText, decodeFromFloatChunk,
    get instance(){ return instance; },
    get context(){ return context; },
    get PROTOCOL(){ return PROTOCOL; },
  };
})();
