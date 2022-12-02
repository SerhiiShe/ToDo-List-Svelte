<script>
    import TodoItem from "./TodoItem.svelte";
    import { bin } from './stores.js';
    import { todos } from "./stores.js";

    function restoreTodo(event) {
        $todos.push(...$bin.splice(event.detail, 1));
        $todos = $todos;
        $bin = $bin;
    }

    function clearBin() {
        $bin = [];
    }
</script>

<div class="bin section">
    <h2>Bin</h2>
    {#each $bin as todo, i}
        <TodoItem index={i} todo={todo.todo} on:todoHandler={restoreTodo}>Restore</TodoItem>
    {/each}
    <button on:click={clearBin}>Clear Bin</button>
</div>