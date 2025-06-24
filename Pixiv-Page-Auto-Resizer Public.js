// ==UserScript==
// @name         이미지/캔버스 자동 크기조정 (role="presentation" 내부) - v1.7 (SPA 대응 개선)
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  role="presentation" 내부 이미지/캔버스 최적화 + SPA URL 변경 시 자동 재적용 + 로딩 중 미리 크기 조정
// @author       ChatGPT
// @match        https://www.pixiv.net/artworks/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function adjustImagesAndCanvas() {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const htmlStyle = document.documentElement.getAttribute('style') || '';
        const overflow = htmlStyle.includes('overflow: hidden');

        document.querySelectorAll('div[role="presentation"]').forEach(p => {
            // IMG
            p.querySelectorAll('img').forEach(img => {
                if (overflow) {
                    img.style.maxWidth = '100vw';
                    img.style.maxHeight = '100vh';
                    img.style.objectFit = 'contain';
                    img.style.display = 'block';
                    img.style.margin = '0 auto';
                    if (img.naturalWidth && img.naturalHeight) {
                        const r = Math.min(winH/img.naturalHeight, winW/img.naturalWidth);
                        img.style.width  = img.naturalWidth * r + 'px';
                        img.style.height = img.naturalHeight * r + 'px';
                    } else {
                        img.style.width = img.style.height = 'auto';
                    }
                } else {
                    img.style.maxWidth = '';
                    img.style.maxHeight = '';
                    img.style.width = '';
                    img.style.height = '';
                    img.style.objectFit = '';
                    img.style.display = '';
                    img.style.margin = '';
                }
            });
            // CANVAS
            p.querySelectorAll('canvas').forEach(c => {
                if (overflow) {
                    if (c.width && c.height) {
                        const r = Math.min(winH/c.height, winW/c.width);
                        c.style.width  = c.width  * r + 'px';
                        c.style.height = c.height * r + 'px';
                        c.style.display = 'block';
                        c.style.margin = '0 auto';
                    }
                } else {
                    c.style.width = '';
                    c.style.height = '';
                    c.style.display = '';
                    c.style.margin = '';
                }
            });
        });
    }

    function observeImages() {
        document.querySelectorAll('div[role="presentation"] img').forEach(img => {
            if (img.complete && img.naturalWidth) {
                adjustImagesAndCanvas();
            } else {
                img.addEventListener('load', adjustImagesAndCanvas);
            }
        });
    }

    function observeButtons() {
        document.querySelectorAll('div.sc-59d2e8c7-0 button').forEach(btn => {
            if (!btn._resizeHandler) {
                btn._resizeHandler = () => {
                    // 즉시, 그리고 10ms 후 한번 더
                    adjustImagesAndCanvas(); observeImages();
                    setTimeout(() => { adjustImagesAndCanvas(); observeImages(); }, 10);
                };
                btn.addEventListener('click', btn._resizeHandler);
            }
        });
    }

    // URL 변경 감지 → DOM 업데이트 후 실행
    function onUrlChange() {
       // 첫 번째 호출: 바로 실행
        setTimeout(() => {
            adjustImagesAndCanvas();
            observeImages();
            observeButtons();

            // 두 번째 호출: 첫 호출 후 20ms 더 기다려서 실행
            setTimeout(() => {
                adjustImagesAndCanvas();
                observeImages();
                observeButtons();
            }, 1);
        }, 20);
    }

    // history API 훅
    const _push = history.pushState;
    history.pushState = function() { _push.apply(this, arguments); onUrlChange(); };
    const _replace = history.replaceState;
    history.replaceState = function() { _replace.apply(this, arguments); onUrlChange(); };
    window.addEventListener('popstate', onUrlChange);

    // 초기 실행
    adjustImagesAndCanvas();
    observeImages();
    observeButtons();

    // 윈도우 리사이즈, DOM 변동 대응
    window.addEventListener('resize', adjustImagesAndCanvas);
    new MutationObserver(adjustImagesAndCanvas).observe(document.body, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['style','class']
    });
    // 버튼도 주기적 스캔
    setInterval(observeButtons, 1000);
})();
