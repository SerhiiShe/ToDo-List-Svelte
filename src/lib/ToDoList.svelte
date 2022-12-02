<script>
    import TodoItem from "./TodoItem.svelte";
    import { bin } from "./stores.js";
    import { todos } from "./stores.js";
    import { activeTodoId } from "./stores.js"

    let newTodo = '';
    let idCounter = 0;

    function addTodo() {
        if (newTodo) {
            $todos = [...$todos, {
                id: idCounter,
                todo: newTodo,
                comment: '...'
            }];
            newTodo = '';
            ++idCounter;
        }
    }

    function deleteTodo(event) {
        $bin.unshift(...$todos.splice(event.detail, 1));
        $todos = $todos;
        $bin = $bin;
    }

    function enterHandler(event) {
        if (event.code === 'Enter') {
            addTodo();
        }
    }

    function setActiveTodoId() {
        $activeTodoId = this.id;
    }
</script>

<div class="todo-list section">
    <div>
        <label>
            Write ToDo
            <input type="text" bind:value={newTodo} on:keydown={enterHandler}>
        </label>
        <button on:click={addTodo}>Add</button>
    </div>
    <h2>ToDos</h2>
    {#each $todos as todo, i}
        <button id={todo.id} class="todo-list__item" on:click={setActiveTodoId}>
            <TodoItem index={i} todo={todo.todo} on:todoHandler={deleteTodo}>Delete</TodoItem>
        </button>
    {/each}
</div>

<style>
    .todo-list {
        grid-row-start: 2;
        grid-row-end: 4;
    }
    .todo-list__item {
        background-color: #333;
    }
</style>