<script>
    import {createEventDispatcher} from 'svelte';
    export let item;
    export let index;

    let dispatch = new createEventDispatcher();

    function restoreItem() {
        dispatch('restoreItem', index);
    }
</script>

<div class="tb">
    <span>{item}</span>
    <a href="#" on:click={restoreItem}>Restore</a>
</div>

<style>
    .tb {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        margin: 5px;
        border-radius: 4px;
        background-color: rgb(255, 206, 196);
    }
    .tb span {
        color: black;
    }
    .tb a {
        text-decoration: none;
        color: rgb(43, 0, 255);
    }
    .tb a:hover {
        font-weight: 700;
    }
</style>