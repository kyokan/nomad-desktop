import fs from 'fs';
import {joinAppDataPath} from "../util/paths";
import {dirExists} from "../util/fs";
import {BookmarkProps} from "../../ui/ducks/bookmark";

const favoriteDir = joinAppDataPath('.favorite');
const topicsPath = `${favoriteDir}/.topics`;
const usersPath = `${favoriteDir}/.users`;
const bookmarksPath = `${favoriteDir}/.bookmarks`;

export default class FavsManager {
  async init () {
    this.ensureDir(favoriteDir);
  }

  async ensureDir (dir: string) {
    const exists = await dirExists(dir);
    if (!exists) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
  }

  getTopics = async (): Promise<string[]> => {
    try {
      const resp = await fs.promises.readFile(topicsPath);
      return resp.toString('utf-8').split('\n');
    } catch (err) {
      return [];
    }
  };

  getUsers = async (): Promise<string[]> => {
    try {
      const resp = await fs.promises.readFile(usersPath);
      return resp.toString('utf-8').split('\n');
    } catch (err) {
      return [];
    }
  };

  getBookmarks = async (): Promise<BookmarkProps[]> => {
    try {
      const resp = await fs.promises.readFile(bookmarksPath);
      const jsonString = resp.toString('utf-8');
      return JSON.parse(jsonString);
    } catch (err) {
      return [];
    }
  };

  addBookmark = async (bookmark: BookmarkProps): Promise<BookmarkProps[]> => {
    const bookmarks = await this.getBookmarks();

    const newBookmarks = bookmarks.concat(bookmark);

    await fs.promises.writeFile(bookmarksPath, JSON.stringify(newBookmarks));

    return newBookmarks;
  };

  removeBookmark = async (bookmark: BookmarkProps): Promise<BookmarkProps[]> => {
    const bookmarks = await this.getBookmarks();


    const newBookmarks = bookmarks.filter(({ url }) => url !== bookmark.url);

    await fs.promises.writeFile(topicsPath, JSON.stringify(newBookmarks));

    return newBookmarks;
  };

  addTopic = async (topic: string): Promise<string[]> => {
    const topics = await this.getTopics();

    if (topics.includes(topic)) {
      return Promise.reject(`${topic} is already added.`);
    }

    const newTopics = topics.concat(topic);

    await fs.promises.writeFile(topicsPath, newTopics.join('\n'));

    return newTopics;
  };

  removeTopic = async (topic: string): Promise<string[]> => {
    const topics = await this.getTopics();


    const newTopics = topics.filter(t => t !== topic);

    await fs.promises.writeFile(topicsPath, newTopics.join('\n'));

    return newTopics;
  };

  addUser = async (user: string): Promise<string[]> => {
    const users = await this.getUsers();

    if (users.includes(user)) {
      return Promise.reject(`${user} is already added.`);
    }

    const newUsers = users.concat(user);

    await fs.promises.writeFile(usersPath, newUsers.join('\n'));

    return newUsers;
  };

  removeUser = async (user: string): Promise<string[]> => {
    const users = await this.getUsers();


    const newUsers = users.filter(u => u !== user);

    await fs.promises.writeFile(usersPath, newUsers.join('\n'));

    return newUsers;
  };
}
