
/* global Zotero, IOUtils, ChromeUtils, Services, Components */
var chromeHandle;
try {
  if (typeof Services === "undefined") {
    var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
  }
} catch (e) {}

function install(data, reason) {}
async function uninstall(data, reason) {}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  try {
    var aomStartup = Components.classes["@mozilla.org/addons/addon-manager-startup;1"]
      .getService(Components.interfaces.amIAddonManagerStartup);
    var manifestURI = Services.io.newURI(rootURI + "manifest.json");
    chromeHandle = aomStartup.registerChrome(manifestURI, [
      ["content", "quicklook7", rootURI + "content/"],
    ]);
  } catch (e) {}

  let onLoad = ({ window }) => attachWindow(window);
  let onUnload = ({ window }) => detachWindow(window);
  Zotero?.onMainWindowLoad?.add(onLoad);
  Zotero?.onMainWindowUnload?.add(onUnload);
  let win = Zotero?.getMainWindow?.();
  if (win) attachWindow(win);
}

async function shutdown({ id, version, resourceURI, rootURI }, reason) {
  if (reason === APP_SHUTDOWN) return;
  if (chromeHandle) { chromeHandle.destruct(); chromeHandle = null; }
  let win = Zotero?.getMainWindow?.();
  if (win) detachWindow(win);
}

// helpers
function getPane(win) { return Zotero.getActiveZoteroPane?.() || (win && win.ZoteroPane) || null; }
function getSelectedItemsSmart(win) {
  try { const p = getPane(win); return p?.getSelectedItems?.() || []; } catch(e){ return []; }
}
async function exists(path) { try { if (typeof IOUtils !== "undefined") return await IOUtils.exists(path); } catch(e){} return false; }

async function getAttachmentPath(item) {
  try {
    if (!item || typeof item.isAttachment !== "function") {
      const id = (item && item.id) ? item.id : item;
      item = await Zotero.Items.getAsync(id);
    }
    if (item?.isAttachment?.() && !item.isNote?.()) {
      return await item.getFilePathAsync();
    }
    if (item?.getBestAttachment) {
      let att = await item.getBestAttachment();
      if (att) return await att.getFilePathAsync();
    }
    if (item?.getAttachments) {
      let children = await item.getAttachments();
      for (let id of children) {
        let att = await Zotero.Items.getAsync(id);
        if (att.isAttachment() && !att.isNote()) {
          let p = await att.getFilePathAsync();
          if (p) return p;
        }
      }
    }
  } catch (e) {}
  return null;
}

// preview runners (no popups)
async function runQLManage(path) {
  let exec = Zotero.Utilities?.Internal?.execAsync || Zotero.Utilities?.Internal?.exec;
  if (!exec) throw new Error("no exec");
  await exec("/usr/bin/qlmanage", ["-p", path]);
}
async function runOpen(path) {
  let exec = Zotero.Utilities?.Internal?.execAsync || Zotero.Utilities?.Internal?.exec;
  if (!exec) throw new Error("no exec");
  await exec("/usr/bin/open", [path]);
}
async function revealInFinder(path) {
  let exec = Zotero.Utilities?.Internal?.execAsync || Zotero.Utilities?.Internal?.exec;
  if (!exec) throw new Error("no exec");
  await exec("/usr/bin/open", ["-R", path]);
}
async function launchViaZotero(path) {
  try { if (Zotero.launchFile) { await Zotero.launchFile(path); return true; } } catch(e){}
  try { if (Zotero.File?.open) { await Zotero.File.open(path); return true; } } catch(e){}
  return false;
}

async function previewWithFallbacks(path) {
  try { await runQLManage(path); return true; } catch(e){}
  try { await runOpen(path); return true; } catch(e){}
  try { const ok = await launchViaZotero(path); if (ok) return true; } catch(e){}
  try { await revealInFinder(path); return true; } catch(e){}
  return false;
}

async function quicklookFromSelection(win) {
  const sel = getSelectedItemsSmart(win);
  if (!sel.length) return;
  let item = sel[0];
  let path = await getAttachmentPath(item);
  if (!path || !(await exists(path))) return;
  await previewWithFallbacks(path);
}

// UI
function addMenus(win) {
  try {
    const doc = win.document;
    const toolsPopup = doc.getElementById("menu_ToolsPopup") || doc.querySelector("#menu_ToolsPopup, #menu-tools-popup, menupopup[id*='Tools']");
    if (toolsPopup && !doc.getElementById("zql7-tools-item")) {
      const mi = doc.createXULElement ? doc.createXULElement("menuitem") : doc.createElement("menuitem");
      mi.setAttribute("id", "zql7-tools-item");
      mi.setAttribute("label", "Quick Look (Space / ⌘Y)");
      mi.addEventListener("command", () => quicklookFromSelection(win));
      toolsPopup.appendChild(mi);
    }
    const ctx = doc.getElementById("zotero-itemmenu");
    if (ctx && !doc.getElementById("zql7-context-item")) {
      const cmi = doc.createXULElement ? doc.createXULElement("menuitem") : doc.createElement("menuitem");
      cmi.setAttribute("id", "zql7-context-item");
      cmi.setAttribute("label", "Quick Look");
      cmi.addEventListener("command", () => quicklookFromSelection(win));
      ctx.appendChild(cmi);
    }
  } catch (e) {}
}

function onKey(ev) {
  const target = ev.target;
  const isForm = target && (["INPUT","TEXTAREA"].includes(target.tagName) || target.isContentEditable);
  if (isForm) return;
  const key = ev.key;
  const meta = ev.metaKey, ctrl = ev.ctrlKey, alt = ev.altKey;
  const macCombo = (key === "y" || key === "Y") && meta && !ctrl && !alt;
  const space = key === " " && !meta && !ctrl && !alt;
  if (space || (Zotero.platform === "mac" && macCombo)) {
    ev.preventDefault(); ev.stopPropagation();
    quicklookFromSelection(ev.view);
  }
}

function attachWindow(win){
  win.addEventListener("keydown", onKey, true);
  addMenus(win);
}
function detachWindow(win){
  win.removeEventListener("keydown", onKey, true);
  const doc = win.document;
  const n1 = doc.getElementById("zql7-tools-item"); if (n1) n1.remove();
  const n2 = doc.getElementById("zql7-context-item"); if (n2) n2.remove();
}
