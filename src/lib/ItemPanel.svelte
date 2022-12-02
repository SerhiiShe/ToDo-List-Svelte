<script>
    import { todos } from './stores.js';
    import { activeTodoId } from './stores.js';

    let newComment = '';
    let todoName = '...';
    let todoComment = '...';

    $: if ($activeTodoId) {
        for (let todo of $todos) {
            if (todo.id == $activeTodoId) {
                todoName = todo.todo;
                todoComment = todo.comment;
                break;
            }
            todoName = '...';
            todoComment = '...';
        }
    }

    $: if (!$todos.length) {
        todoName = '...';
        todoComment = '...';
        $activeTodoId = undefined;
    }

    function addComment() {
        for (let todo of $todos) {
            if (todo.id == $activeTodoId && newComment) {
                todo.comment = newComment;
                todoComment = newComment;
                newComment = '';
            }
        }
    }

    function enterHandler(event) {
        if (event.code === 'Enter') addComment();
    }
</script>

<div class="item-panel section">
    <h2>{todoName}</h2>
    <input type="text" bind:value={newComment} on:keydown={enterHandler}>
    <button on:click={addComment}>Add Comment</button>
    <p>{todoComment}</p>
</div>