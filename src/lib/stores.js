import { writable } from 'svelte/store';

export let todos = writable([]);
export let bin = writable([]);
export let activeTodoId = writable();