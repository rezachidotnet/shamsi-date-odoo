/** @odoo-module **/

// import { registry } from "@web/core/registry";

/* -----------------------
   Convert Gregorian -> Jalali
------------------------*/
export function toJalali(date) {
    if (!date) return "";
    const year = typeof date.year === "number" ? date.year : date.getFullYear?.();
    const month = typeof date.month === "number" ? date.month : date.getMonth?.() + 1;
    const day = typeof date.day === "number" ? date.day : date.getDate?.();
    if (!year || !month || !day) return "";
    if (!window.jalali?.toJalaali) return `${year}/${month}/${day}`;
    const j = window.jalali.toJalaali(year, month, day);
    return j;
}

export function jMonthName(m) {
    const months = [
        "فروردین","اردیبهشت","خرداد",
        "تیر","مرداد","شهریور",
        "مهر","آبان","آذر",
        "دی","بهمن","اسفند"
    ];
    return months[m-1] || "";
}

/* -----------------------
   Inject Jalali text into an element
------------------------*/
export function updateOrCreateElement(parent, className, text, style = {}) {

    if (!parent) return;

    let el = parent.querySelector(`.${className}`);
    if (!el) {
        el = document.createElement("div");
        el.className = className;
        Object.assign(el.style, style);
        parent.appendChild(el);
    }
    if (el.innerText !== text) 
        {
            el.innerText = text;
        }
}


export function createDiv(className, text, style = {}) {
    const el = document.createElement("div");
    el.className = className;
    el.innerText = text;
    Object.assign(el.style, style);
    return el;
}



