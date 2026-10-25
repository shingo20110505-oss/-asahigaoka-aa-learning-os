// Views keep their DOM and closures for this app session. Persistent learning data
// still belongs to Store; chat credentials/history belong to the chat workspace.
export const viewPath = hash => (String(hash || '').replace(/^#?\/?/, '') || 'home');
export function viewGroup(path) {
  const route = viewPath(path).split(/[/?]/)[0];
  return ['reading','vocabulary','classical','review','memory','history','labs','focus','explore','evidence','listening'].includes(route)
    ? 'learn' : ['materials','desk'].includes(route) ? 'notes' : route;
}

export class ViewCache {
  constructor({create, mount, attach, capture, restore, revision, error}) {
    Object.assign(this, {create, mount, attach, capture, restore, revision, error});
    this.entries = new Map(); this.last = new Map(); this.current = null;
    this.generation = 0; this.pending = Promise.resolve();
  }
  active(entry) { return this.current === entry && entry.activation === this.generation; }
  destination(group) { return this.last.get(group) || group; }
  remember(path) {
    const entry = this.current;
    if (!entry || !this.active(entry)) return;
    path = viewPath(path);
    if (entry.path !== path) {
      const other = this.entries.get(path);
      // A reader can change its URL without a new route mount.
      if (other && other !== entry) Promise.resolve(other.controller?.()).catch(this.error);
      if (this.entries.get(entry.path) === entry) this.entries.delete(entry.path);
      entry.path = path; this.entries.set(path, entry);
    }
    this.last.set(viewGroup(path), path);
  }
  async show(path, {reload = false} = {}) {
    path = viewPath(path);
    const ticket = ++this.generation;
    await this.pending.catch(() => {});
    if (ticket !== this.generation) return;
    this.pending = this.switchTo(path, ticket, reload);
    return this.pending;
  }
  async switchTo(path, ticket, reload) {
    const previous = this.current;
    if (previous?.path === path && previous.ready && !reload) {
      previous.activation = ticket;
      this.attach(previous);
      return;
    }
    if (previous) {
      previous.position = this.capture(previous);
      try { await previous.controller?.suspend?.(); } catch (error) { this.error(error); }
      this.current = null;
      if (!previous.ready || reload && previous.path === path) {
        await previous.controller?.();
        this.entries.delete(previous.path);
      }
    }
    if (ticket !== this.generation) return;
    let entry = this.entries.get(path);
    const cached = Boolean(entry?.ready);
    if (!entry) {
      entry = {path, element:this.create(), ready:false, revision:this.revision()};
      this.entries.set(path, entry);
    }
    this.current = entry; entry.activation = ticket;
    this.last.set(viewGroup(path), path);
    this.attach(entry);
    try {
      if (cached) {
        if (entry.revision !== this.revision()) await entry.controller?.refresh?.();
        if (!this.active(entry)) return;
        await entry.controller?.resume?.();
      } else {
        entry.controller = await this.mount(entry) || (() => {});
        entry.ready = this.active(entry);
      }
      if (!this.active(entry)) return;
      entry.revision = this.revision();
      this.restore(entry, cached ? entry.position : null, () => this.active(entry));
    } catch (error) {
      entry.ready = false;
      if (this.active(entry)) this.error(error, entry);
    }
  }
  async refresh() {
    const entry = this.current;
    if (!entry?.ready || !this.active(entry)) return;
    const position = this.capture(entry);
    await entry.controller?.refresh?.();
    if (this.active(entry)) {
      entry.revision = this.revision();
      this.restore(entry, position, () => this.active(entry));
    }
  }
  // Flush suspended drafts before importing a backup so they cannot later
  // overwrite restored data. The settings screen stays until import succeeds.
  async clearInactive() {
    for (const entry of this.entries.values()) {
      if (entry !== this.current) await entry.controller?.flush?.();
    }
    for (const [path, entry] of this.entries) {
      if (entry === this.current) continue;
      await entry.controller?.();
      this.entries.delete(path);
    }
    this.last.clear();
    if (this.current) this.last.set(viewGroup(this.current.path), this.current.path);
  }
}

export function capturePosition(main, win = window) {
  const nodes = [...main.querySelectorAll('*')];
  return {x:win.scrollX, y:win.scrollY, scroll:nodes.flatMap((node, index) =>
    node.scrollTop || node.scrollLeft ? [{node, index, top:node.scrollTop, left:node.scrollLeft}] : []),
    details:[...main.querySelectorAll('details')].map(node=>({open:node.open,summary:node.querySelector('summary')?.textContent}))};
}
export function restorePosition(main, position, active, win = window) {
  const apply = () => {
    if (!active()) return;
    [...main.querySelectorAll('details')].forEach((node,index)=>{
      const saved=position?.details?.[index];
      if(saved && saved.summary===node.querySelector('summary')?.textContent)node.open=saved.open;
    });
    const nodes = [...main.querySelectorAll('*')];
    for (const item of position?.scroll || []) {
      const node = main.contains(item.node) ? item.node : nodes[item.index];
      if (node) {node.scrollTop = item.top; node.scrollLeft = item.left;}
    }
    win.scrollTo({left:position?.x || 0, top:position?.y || 0, behavior:'instant'});
  };
  apply(); win.requestAnimationFrame(apply);
}
