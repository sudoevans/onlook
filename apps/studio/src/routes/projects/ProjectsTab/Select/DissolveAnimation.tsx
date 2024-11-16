import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DissolveAnimationProps {
    onAnimationComplete: () => void;
    previewImage: string;
}

export default function DissolveAnimation({
    onAnimationComplete,
    previewImage,
}: DissolveAnimationProps) {
    const [isAnimating, setIsAnimating] = useState(true);
    const displayedImageRef = useRef<HTMLImageElement>(null);
    const displacementMapRef = useRef<SVGFEDisplacementMapElement>(null);
    const bigNoiseRef = useRef<SVGFETurbulenceElement>(null);

    useEffect(() => {
        if (bigNoiseRef.current) {
            const randomSeed = Math.floor(Math.random() * 1000);
            bigNoiseRef.current.setAttribute('seed', randomSeed.toString());
        }

        const duration = 1000;
        const startTime = performance.now();
        const maxDisplacementScale = 2000;

        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);

            const displacementScale = easedProgress * maxDisplacementScale;
            if (displacementMapRef.current) {
                displacementMapRef.current.setAttribute('scale', displacementScale.toString());
            }

            const scaleFactor = 1 + 0.1 * easedProgress;
            if (displayedImageRef.current) {
                displayedImageRef.current.style.transform = `scale(${scaleFactor})`;
                displayedImageRef.current.style.opacity =
                    progress < 0.5 ? '1' : (1 - (progress - 0.5) / 0.5).toString();
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsAnimating(false);
                onAnimationComplete();
            }
        };

        requestAnimationFrame(animate);
    }, [onAnimationComplete]);

    return (
        <AnimatePresence>
            {isAnimating && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="hidden">
                        <defs>
                            <filter
                                id="dissolve-filter"
                                x="-200%"
                                y="-200%"
                                width="500%"
                                height="500%"
                                colorInterpolationFilters="sRGB"
                            >
                                <feTurbulence
                                    type="fractalNoise"
                                    baseFrequency="0.004"
                                    numOctaves="1"
                                    result="bigNoise"
                                    ref={bigNoiseRef}
                                />
                                <feComponentTransfer in="bigNoise" result="bigNoiseAdjusted">
                                    <feFuncR type="linear" slope="3" intercept="-1" />
                                    <feFuncG type="linear" slope="3" intercept="-1" />
                                </feComponentTransfer>
                                <feTurbulence
                                    type="fractalNoise"
                                    baseFrequency="1"
                                    numOctaves="1"
                                    result="fineNoise"
                                />
                                <feMerge result="mergedNoise">
                                    <feMergeNode in="bigNoiseAdjusted" />
                                    <feMergeNode in="fineNoise" />
                                </feMerge>
                                <feDisplacementMap
                                    in="SourceGraphic"
                                    in2="mergedNoise"
                                    scale="0"
                                    xChannelSelector="R"
                                    yChannelSelector="G"
                                    ref={displacementMapRef}
                                />
                            </filter>
                        </defs>
                    </svg>

                    <div className="relative w-[500px] max-w-[90vw] h-[500px] bg-black overflow-visible rounded-3xl">
                        <img
                            ref={displayedImageRef}
                            src={previewImage}
                            alt="Project being deleted"
                            className="w-full h-full object-cover rounded-3xl"
                            style={{
                                filter: 'url(#dissolve-filter)',
                                WebkitFilter: 'url(#dissolve-filter)',
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
