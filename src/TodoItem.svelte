<script>
    import {createEventDispatcher} from 'svelte';

    export let item;
    export let index;

    let dispatch = new createEventDispatcher();

    function removeItem() {
        dispatch('removeItem', index);
    }
</script>

<div class="ti">
    <span>{index + 1}. {item};</span>
    <a href="#" on:click={removeItem}>Delete</a>
</div>

<style>
    .ti {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        margin: 5px;
        border-radius: 4px;
        background-color: bisque;
    }
    .ti span {
        color: black;
    }
    .ti a {
        text-decoration: none;
        color: red;
    }
    .ti a:hover {
        font-weight: 700;
    }
</style>