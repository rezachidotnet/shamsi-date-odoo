/** @odoo-module **/

// import { registry } from "@web/core/registry";

/* -----------------------
   Convert Gregorian -> Jalali
------------------------*/
export function toJalali(date) {
    if (!date) return "";
    if (!window.jalali?.toJalaali) return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    const j = window.jalali.toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
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




