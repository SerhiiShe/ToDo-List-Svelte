<script>
    import TodoItem from "./TodoItem.svelte";
    import TodoComment from "./TodoComment.svelte";
    import TodoBin from "./TodoBin.svelte";

    let newTodo = "";
    let todos = [];
    let idCounter = 0;
    let activeItemId;
    let newComment = "";
    let bin = [];

    function addTodo() {
        if (newTodo !== "") {
            ++idCounter;
            todos.push({
                id: idCounter,
                item: newTodo,
                comment: "",
                deadline: ""
            });
            todos = todos;
            newTodo = "";
        }
    }

    function handleEnterKey(event) {
        if (event.code === "Enter") addTodo();
    }

    function handleEnterKeyComment(event) {
        if (event.code === "Enter") addComment();
    }

    function removeItem(event) {
        bin.unshift(...todos.splice(event.detail, 1));
        todos = todos;
        bin = bin;
    }

    function setActiveItem() {
        activeItemId = this.id;
    }

    function addComment() {
        if (newComment !== "" && activeItemId !== undefined) {
            let item = todos.forEach((elem) => {
                if (elem.id == activeItemId) elem.comment = newComment;
            });
            todos = todos;
            newComment = "";
        }
    }

    function restoreItem(event) {
        todos.push(...bin.splice(event.detail, 1));
        todos = todos;
        bin = bin;
    }

    function clearBin() {
        bin = [];
    }
</script>

<div class="tl">
    <h1 class="tl__title">Todo List</h1>

    <div class="tl__main block">
        <input
            class="input"
            on:keydown={handleEnterKey}
            type="text"
            bind:value={newTodo}
        />
        <button class="button" on:click={addTodo}>Add New Todo Item</button>

        {#each todos as todo, i}
            <a class="tl__item" href="#" id={todo.id} on:click={setActiveItem}>
                <TodoItem
                    on:removeItem={removeItem}
                    item={todo.item}
                    index={i}
                />
            </a>
        {/each}
    </div>

    <div class="tl__comment block">
        <input
            class="input"
            on:keydown={handleEnterKeyComment}
            type="text"
            bind:value={newComment}
        />
        <button class="button" on:click={addComment}>Add Comment</button>

        {#each todos as todo}
            {#if todo.id == activeItemId}
                <TodoComment
                    comment={todo.comment}
                    todoItemName={todo.item}
                />
            {/if}
        {/each}
    </div>

    <div class="tl__bin block">
        <button class="button" on:click={clearBin}>Clear Bin</button>
        {#each bin as deletedItem, i}
            <TodoBin
                on:restoreItem={restoreItem}
                item={deletedItem.item}
                index={i}
            />
        {/each}
    </div>
</div>

<style>
    .tl {
        display: grid;
        width: 100%;
        height: 100%;
        grid-template-columns: 50% 50%;
        grid-template-rows: auto 50% 50%;
        grid-template-areas:
            "title title"
            "main comment"
            "main bin";
    }
    .tl__title {
        grid-area: title;
        background-color: greenyellow;
        text-align: center;
        margin: 0;
        padding: 20px;
    }
    .tl__main {
        grid-area: main;
        background-color: rgb(139, 139, 224);
        min-height: 100%;
    }
    .tl__comment {
        grid-area: comment;
        background-color: rgb(245, 245, 154);
    }
    .tl__bin {
        grid-area: bin;
        background-color: rgb(214, 113, 113);
    }
    .block {
        padding: 20px;
        overflow: scroll;
    }
    .input {
        width: 100%;
        border: 2px solid rgb(54, 52, 55);
        border-radius: 4px;
    }
    .button {
        width: 100%;
        background-color: rgb(191, 239, 133);
        border: 2px solid rgb(145, 117, 160);
        border-radius: 4px;
    }
    .button:hover {
        background-color: rgb(145, 117, 160);
        cursor: pointer;
    }
    .tl__item {
        text-decoration: none;
    }
    .tl__item:hover {
        opacity: 80%;
    }
</style>
