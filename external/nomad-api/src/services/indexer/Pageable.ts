export class Pageable<T, U> {
  public readonly items: T[];

  public readonly next: U | null;

  constructor (items: T[], next: U | null) {
    this.items = items;
    this.next = next;
  }
}