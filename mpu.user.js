// ==UserScript==
// @name         Moodle PowerUp!
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Custom Moodle video controls and auto-login
// @match        *://main.elearning.uni-obuda.hu/*
// @match        *://idp.uni-obuda.hu/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // video player
  const initVideoControls = () => {
    document.addEventListener("keydown", (e) => {
      const video = document.querySelector("video");
      if (!video) return;

      // Only trigger if not typing in an input/textarea
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName))
        return;

      const skipSec = 5;
      const volStep = 0.1;

      switch (e.key) {
        case "ArrowRight":
          video.currentTime += skipSec;
          e.preventDefault();
          break;
        case "ArrowLeft":
          video.currentTime -= skipSec;
          e.preventDefault();
          break;
        case "ArrowUp":
          video.volume = Math.min(1, video.volume + volStep);
          e.preventDefault();
          break;
        case "ArrowDown":
          video.volume = Math.max(0, video.volume - volStep);
          e.preventDefault();
          break;
      }
    });
  };

  // auto login
  const initAutoLogin = () => {
    const loginBtn = document.querySelector("#submit_button");
    const username = document.querySelector("#username");
    const password = document.querySelector("#password");

    if (loginBtn && username && password) {
      // Wait briefly for browser password managers to fill fields
      setTimeout(() => {
        if (username.value.trim() !== "" && password.value.trim() !== "") {
          loginBtn.click();
        }
      }, 800);
    }
  };

  // redirect after login
  const initRedirect = () => {
    if (
      window.location.pathname === "/" &&
      document.referrer.includes("idp.uni-obuda.hu")
    ) {
      window.location.replace("/my/courses.php");
    }
  };

  // kurzusok default
  const initCourseDefaults = () => {
    if (!window.location.pathname.includes("/my/courses.php")) return;

    let tries = 0;
    const timer = setInterval(() => {
      tries++;

      const pagingLimit = document.querySelector(
        '[data-region="paging-control-limit-container"]',
      );
      const filterRegion = document.querySelector('[data-region="filter"]');

      let limitSet = false;
      let semesterSet = false;

      // mind
      if (pagingLimit) {
        const limitBtn = pagingLimit.querySelector("button.dropdown-toggle");
        const showAll = pagingLimit.querySelector(
          'a.dropdown-item[data-limit="0"]',
        );
        if (limitBtn && limitBtn.innerText.includes("Mind")) {
          limitSet = true;
        } else if (showAll) {
          showAll.click();
        }
      }

      // latest semester
      if (filterRegion) {
        const groupBtn = filterRegion.querySelector("#groupingdropdown");
        const semesterLinks = Array.from(
          filterRegion.querySelectorAll(
            'a.dropdown-item[data-filter="grouping"][data-value="customfield"]',
          ),
        ).filter((el) => parseInt(el.dataset.customfieldvalue) > 0);

        if (semesterLinks.length > 0) {
          const latest = semesterLinks.reduce((a, b) =>
            parseInt(a.dataset.customfieldvalue) >
            parseInt(b.dataset.customfieldvalue)
              ? a
              : b,
          );
          if (
            groupBtn &&
            groupBtn.innerText.includes(latest.innerText.trim())
          ) {
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

  // hider
  const initItemHider = () => {
    if (!window.location.pathname.includes("/course/view.php")) return;

    if (!document.querySelector("#moodle-hider-styles")) {
      const style = document.createElement("style");
      style.id = "moodle-hider-styles";
      style.innerHTML = `
                  .hide-item-btn { cursor: pointer; opacity: 0; transition: opacity 0.2s; color: #6c757d; position: absolute; right: 15px; top: 50%; transform: translateY(-50%); z-index: 10; font-size: 1.2em; }
                  li.activity:hover > .activity-item > .hide-item-btn,
                  li.section:hover > .section-item > .course-section-header > .hide-item-btn { opacity: 1; }
                  .hide-item-btn:hover { color: #dc3545; }
                  .moodle-item-hidden { display: none !important; }
                  .moodle-header-btn { white-space: nowrap; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; height: 32px; }
              `;
      document.head.appendChild(style);
    }

    const getHidden = () =>
      JSON.parse(localStorage.getItem("moodle_hidden_v2") || "[]");
    const saveHidden = (ids) =>
      localStorage.setItem("moodle_hidden_v2", JSON.stringify(ids));

    const createHideBtn = (targetElement, storageId) => {
      const btn = document.createElement("i");
      btn.className = "fa fa-eye-slash hide-item-btn";
      btn.title = "Elem elrejtése";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        targetElement.classList.add("moodle-item-hidden");
        const curr = getHidden();
        if (!curr.includes(storageId)) saveHidden([...curr, storageId]);
      });
      return btn;
    };

    const updateItems = () => {
      const hiddenIds = getHidden();
      const header = document.querySelector(".page-header-headings");

      if (header) {
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.flexWrap = "wrap";
        header.style.gap = "10px";

        const collapseMenu = document.querySelector("#collapsesections");
        let unhideBtn = document.querySelector("#unhide-all-btn");

        if (!unhideBtn) {
          unhideBtn = document.createElement("button");
          unhideBtn.id = "unhide-all-btn";
          unhideBtn.className =
            "btn btn-sm btn-outline-secondary moodle-header-btn";
          unhideBtn.innerText = "Összes rejtett megjelenítése";
          unhideBtn.addEventListener("click", () => {
            saveHidden([]);
            document
              .querySelectorAll(".moodle-item-hidden")
              .forEach((el) => el.classList.remove("moodle-item-hidden"));
          });
        }

        if (collapseMenu && collapseMenu.parentElement !== header) {
          collapseMenu.classList.add(
            "btn",
            "btn-sm",
            "btn-outline-secondary",
            "moodle-header-btn",
          );
          header.appendChild(collapseMenu);
        }

        header.appendChild(unhideBtn);
      }

      document.querySelectorAll("li.activity").forEach((li) => {
        const rawId = li.getAttribute("data-id");
        if (!rawId) return;

        const id = "cm-" + rawId;
        if (hiddenIds.includes(id)) li.classList.add("moodle-item-hidden");

        const itemWrapper = li.querySelector(".activity-item");
        if (itemWrapper && !itemWrapper.querySelector(".hide-item-btn")) {
          itemWrapper.style.position = "relative";
          itemWrapper.appendChild(createHideBtn(li, id));
        }
      });

      document.querySelectorAll("li.section").forEach((section) => {
        const rawId = section.getAttribute("data-id");
        if (!rawId) return;

        const id = "sec-" + rawId;
        if (hiddenIds.includes(id)) section.classList.add("moodle-item-hidden");

        const sectionHeader = section.querySelector(".course-section-header");
        if (sectionHeader && !sectionHeader.querySelector(".hide-item-btn")) {
          sectionHeader.style.position = "relative";
          sectionHeader.appendChild(createHideBtn(section, id));
        }
      });
    };

    updateItems();

    const observer = new MutationObserver(() => updateItems());
    const courseContent = document.querySelector(".course-content");
    if (courseContent)
      observer.observe(courseContent, { childList: true, subtree: true });
  };

  const run = () => {
    initVideoControls();
    initAutoLogin();
    initRedirect();
    initCourseDefaults();
    initItemHider();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
