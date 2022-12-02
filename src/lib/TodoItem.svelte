<script>
    import { createEventDispatcher } from 'svelte';
    export let todo;
    export let index;

    let dispatch = createEventDispatcher();

    function todoHandler() {
        dispatch ('todoHandler', index)
    }
</script>

<div class="todo-item">
    {todo}
    <button on:click|stopPropagation={todoHandler}>
        <slot></slot>
    </button>
</div>