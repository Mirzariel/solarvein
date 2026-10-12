import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Lag smoothing: a frame gap longer than 120 ms (the React commit that follows a click, a shader compile, GC) advances
 * GSAP by only 33 ms. A 1 s weather transition therefore stretches a little under load instead of jumping to its end
 * before the first painted frame (QA/perf audits saw scenes already final at 650 ms). Imported for its side effect by
 * everything that uses GSAP.
 */
gsap.ticker.lagSmoothing(120, 33);

// Scroll choreography (opening video, pinned stages, interlude). Registered once, here, with the core config.
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

export { ScrollTrigger };
