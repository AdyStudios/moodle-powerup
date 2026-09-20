// ==UserScript==
// @name         Moodle Superuser
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Custom Moodle video controls and auto-login
// @match        *://main.elearning.uni-obuda.hu/*
// @match        *://idp.uni-obuda.hu/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. Video Player Controls (Arrows for Seek/Volume)
    const initVideoControls = () => {
        document.addEventListener('keydown', (e) => {
            const video = document.querySelector('video');
            if (!video) return;

            // Only trigger if not typing in an input/textarea
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            const skipSec = 5;
            const volStep = 0.1;

            switch(e.key) {
                case 'ArrowRight':
                    video.currentTime += skipSec;
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    video.currentTime -= skipSec;
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    video.volume = Math.min(1, video.volume + volStep);
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    video.volume = Math.max(0, video.volume - volStep);
                    e.preventDefault();
                    break;
            }
        });
    };

    // 2. Auto-Login
    const initAutoLogin = () => {
        const loginBtn = document.querySelector('#submit_button');
        const username = document.querySelector('#username');
        const password = document.querySelector('#password');

        if (loginBtn && username && password) {
            // Wait briefly for browser password managers to fill fields
            setTimeout(() => {
                if (username.value.trim() !== '' && password.value.trim() !== '') {
                    loginBtn.click();
                }
            }, 800);
        }
    };

    //3. Redirect
    const initRedirect = () => {
        if (window.location.pathname === '/' && document.referrer.includes('idp.uni-obuda.hu')) {
            window.location.replace('/my/courses.php');
        }
    };

    // 4. Course Page Defaults (Retries until Moodle finishes loading)
    const initCourseDefaults = () => {
        if (!window.location.pathname.includes('/my/courses.php')) return;

        let tries = 0;
        const timer = setInterval(() => {
            tries++;

            const pagingLimit = document.querySelector('[data-region="paging-control-limit-container"]');
            const filterRegion = document.querySelector('[data-region="filter"]');

            let limitSet = false;
            let semesterSet = false;

            // 1. Force "Show All"
            if (pagingLimit) {
                const limitBtn = pagingLimit.querySelector('button.dropdown-toggle');
                const showAll = pagingLimit.querySelector('a.dropdown-item[data-limit="0"]');
                if (limitBtn && limitBtn.innerText.includes('Mind')) {
                    limitSet = true;
                } else if (showAll) {
                    showAll.click();
                }
            }

            // 2. Select Latest Semester
            if (filterRegion) {
                const groupBtn = filterRegion.querySelector('#groupingdropdown');
                const semesterLinks = Array.from(filterRegion.querySelectorAll('a.dropdown-item[data-filter="grouping"][data-value="customfield"]'))
                    .filter(el => parseInt(el.dataset.customfieldvalue) > 0);

                if (semesterLinks.length > 0) {
                    const latest = semesterLinks.reduce((a, b) => parseInt(a.dataset.customfieldvalue) > parseInt(b.dataset.customfieldvalue) ? a : b);
                    if (groupBtn && groupBtn.innerText.includes(latest.innerText.trim())) {
                        semesterSet = true;
                    } else if (latest) {
                        latest.click();
                    }
                }
            }

            if ((limitSet && semesterSet) || tries > 20) {
                clearInterval(timer);
            }
        }, 500);
    };

    // Main Execution (Modular for future additions)
    const run = () => {
        initVideoControls();
        initAutoLogin();
        initRedirect();
        initCourseDefaults();
        // Add new init() functions here in the future
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();