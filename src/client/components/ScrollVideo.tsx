import React, { useEffect, useRef, useState } from 'react';

const CLOUDFRONT_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260729_102822_0e6c87e8-c141-4744-bf32-ad30db296371.mp4';
const LOCAL_MIRROR_URL = '/hero.mp4';

export const ScrollVideo: React.FC = () => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [framesReady, setFramesReady] = useState(false);
  const [hasPoster, setHasPoster] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const framesRef = useRef<ImageBitmap[]>([]);
  const smoothedRef = useRef(0);
  const targetRef = useRef(0);
  const isSeekingRef = useRef(false);
  const videoSourceRef = useRef(LOCAL_MIRROR_URL);

  const isFrozenRef = useRef(false);
  const [isPastHero, setIsPastHero] = useState(false);

  // 1. Scroll listener on SectionTwo container with end freeze detection
  useEffect(() => {
    const handleScroll = () => {
      const sectionTwoEl = document.getElementById("section-two");
      const scrubEnd = sectionTwoEl
        ? (sectionTwoEl.offsetTop + sectionTwoEl.offsetHeight - window.innerHeight)
        : document.body.scrollHeight;
      const progress = Math.min(Math.max(window.scrollY / scrubEnd, 0), 1);

      if (progress >= 1.0) {
        isFrozenRef.current = true;
        setIsPastHero(true);
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        targetRef.current = 1.0;
      } else {
        isFrozenRef.current = false;
        setIsPastHero(false);
        targetRef.current = progress;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // 2. High-speed multi-pass frame extraction (Fast 24-frame pass → Full 90-frame pass)
  useEffect(() => {
    if (!videoLoaded) return;

    let cancelled = false;

    const extractFrames = async () => {
      try {
        const offVideo = document.createElement('video');
        offVideo.muted = true;
        offVideo.playsInline = true;
        offVideo.preload = 'auto';
        offVideo.crossOrigin = 'anonymous';
        offVideo.src = videoSourceRef.current;

        await new Promise<void>((resolve, reject) => {
          offVideo.onloadedmetadata = () => resolve();
          offVideo.onerror = () => {
            // Fallback to CloudFront if local mirror fails
            if (offVideo.src !== CLOUDFRONT_URL) {
              offVideo.src = CLOUDFRONT_URL;
            } else {
              reject(new Error('Video failed to load'));
            }
          };
        });

        if (cancelled) return;

        const duration = offVideo.duration || 5;
        const targetWidth = Math.min(960, offVideo.videoWidth || 960);
        const aspect = (offVideo.videoHeight || 540) / (offVideo.videoWidth || 960);
        const targetHeight = Math.round(targetWidth * aspect);

        const offCanvas = document.createElement('canvas');
        offCanvas.width = targetWidth;
        offCanvas.height = targetHeight;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (!offCtx) return;

        offCtx.imageSmoothingEnabled = true;
        offCtx.imageSmoothingQuality = 'high';

        // Helper to grab a single frame at timestamp t
        const captureFrame = async (time: number): Promise<ImageBitmap | null> => {
          return new Promise<ImageBitmap | null>((res) => {
            let timeoutId: any;
            const onSeeked = async () => {
              clearTimeout(timeoutId);
              offVideo.removeEventListener('seeked', onSeeked);
              try {
                offCtx.drawImage(offVideo, 0, 0, targetWidth, targetHeight);
                const bitmap = await createImageBitmap(offCanvas);
                res(bitmap);
              } catch {
                res(null);
              }
            };
            timeoutId = setTimeout(() => {
              offVideo.removeEventListener('seeked', onSeeked);
              res(null);
            }, 500);

            offVideo.addEventListener('seeked', onSeeked);
            offVideo.currentTime = time;
          });
        };

        // Pass 1: Fast initial extraction of 24 frames (renders within < 1 second)
        const initialFramesCount = 24;
        const pass1Frames: ImageBitmap[] = [];

        for (let i = 0; i < initialFramesCount; i++) {
          if (cancelled) return;
          const time = (i / (initialFramesCount - 1)) * Math.max(0.05, duration - 0.05);
          const bitmap = await captureFrame(time);
          if (bitmap) {
            pass1Frames.push(bitmap);
          }
        }

        if (!cancelled && pass1Frames.length >= 10) {
          framesRef.current = pass1Frames;
          setFramesReady(true);
        }

        // Pass 2: High density background extraction up to 90 frames for silky smooth scrubbing
        const totalTargetFrames = Math.min(90, Math.max(48, Math.floor(duration * 16)));
        const highResFrames: ImageBitmap[] = [];

        for (let i = 0; i < totalTargetFrames; i++) {
          if (cancelled) return;
          const time = (i / (totalTargetFrames - 1)) * Math.max(0.05, duration - 0.05);
          const bitmap = await captureFrame(time);
          if (bitmap) {
            highResFrames.push(bitmap);
          }
        }

        if (!cancelled && highResFrames.length > pass1Frames.length) {
          framesRef.current = highResFrames;
        }
      } catch (err) {
        console.warn('[ScrollVideo] Optimization fallback:', err);
      }
    };

    const timer = setTimeout(extractFrames, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [videoLoaded]);

  // 3. Silky 60FPS animation loop with adaptive lerp smoothing
  useEffect(() => {
    let animId: number;

    const render = () => {
      const target = targetRef.current;
      const current = smoothedRef.current;

      // Smooth exponential decay lerp for fluid cinematic motion (frozen when past hero)
      if (!isFrozenRef.current) {
        const diff = target - current;
        smoothedRef.current += diff * 0.095;
      }
      const progress = smoothedRef.current;

      const canvas = canvasRef.current;
      const video = videoRef.current;

      // Draw frames on canvas with high-quality scaling
      if (framesReady && canvas && framesRef.current.length > 0) {
        const frames = framesRef.current;
        const index = Math.min(
          Math.max(0, Math.floor(progress * (frames.length - 1))),
          frames.length - 1
        );
        const frame = frames[index];

        const ctx = canvas.getContext('2d');
        if (ctx && frame) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const cw = canvas.clientWidth;
          const ch = canvas.clientHeight;

          if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
            canvas.width = cw * dpr;
            canvas.height = ch * dpr;
          }

          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          const fw = frame.width;
          const fh = frame.height;
          const scale = Math.max(cw / fw, ch / fh);
          const dw = fw * scale;
          const dh = fh * scale;
          const dx = (cw - dw) / 2;
          const dy = (ch - dh) / 2;

          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(frame, dx, dy, dw, dh);
          ctx.restore();
        }
      } else if (video && video.duration && !framesReady) {
        // Fallback: fast seeking on local video buffer
        const duration = video.duration;
        const targetTime = progress * Math.max(0.05, duration - 0.05);

        if (!isSeekingRef.current && Math.abs(video.currentTime - targetTime) > 0.02) {
          if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
            (video as any).fastSeek(targetTime);
          } else {
            video.currentTime = targetTime;
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animId);
  }, [framesReady]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 bg-[#0a0a0a] overflow-hidden pointer-events-none transform-gpu will-change-transform"
    >
      {/* 1. Poster Layer (fades out duration-500 once video loaded or frames ready) */}
      <div
        className={`absolute inset-0 bg-[#0a0a0a] transition-opacity duration-500 ease-out ${
          videoLoaded || framesReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <img
          src="/hero-poster.jpg"
          alt=""
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            hasPoster ? 'opacity-100' : 'opacity-0'
          }`}
          onError={() => setHasPoster(false)}
        />
      </div>

      {/* 2. Visible Video Layer (fallback while frames caching) */}
      <video
        ref={videoRef}
        src={LOCAL_MIRROR_URL}
        onError={() => {
          // If local mirror fails, fallback to CloudFront
          if (videoRef.current && videoRef.current.src !== CLOUDFRONT_URL) {
            videoRef.current.src = CLOUDFRONT_URL;
            videoSourceRef.current = CLOUDFRONT_URL;
          }
        }}
        muted
        playsInline
        preload="auto"
        onLoadedData={() => {
          setVideoLoaded(true);
        }}
        onSeeking={() => {
          isSeekingRef.current = true;
        }}
        onSeeked={() => {
          isSeekingRef.current = false;
        }}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out will-change-transform ${
          videoLoaded && !framesReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 3. Canvas Layer (draws scrubbed frames with lerp & object-cover) */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out will-change-transform ${
          framesReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Subtle cinematic gradient vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/30 via-transparent to-[#0a0a0a]/80 pointer-events-none" />

      {/* Static frozen background frame overlay with smooth dark vignette/gradient fade */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/80 to-[#0a0a0a] transition-opacity duration-700 ease-out pointer-events-none ${
          isPastHero ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
