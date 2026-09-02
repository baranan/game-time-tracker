import { createFakeData } from "../fake-data.js";

// Implements the shared data interface with browser-local persistence.
export class LocalAdapter {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.key = "game-time-tracker-fakelocal-v1";
  }

  async load() {
    const saved = this.storage.getItem(this.key);
    if (saved) return JSON.parse(saved);

    const seed = createFakeData();
    this.#write(seed);
    return seed;
  }

  async saveSession(session) {
    const data = await this.load();
    const index = data.sessions.findIndex((item) => item.id === session.id);
    if (index >= 0) data.sessions[index] = session;
    else data.sessions.push(session);
    this.#write(data);
    return session;
  }

  async deleteSession(id) {
    const data = await this.load();
    data.sessions = data.sessions.filter((item) => item.id !== id);
    this.#write(data);
  }

  async setWeeklyAdjustment(weekKey, minutes) {
    const data = await this.load();
    data.weeklyAdjustments[weekKey] = minutes;
    this.#write(data);
  }

  #write(data) {
    this.storage.setItem(this.key, JSON.stringify(data));
  }
}

