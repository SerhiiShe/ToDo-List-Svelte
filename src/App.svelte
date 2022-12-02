<script>
  import ToDoList from './lib/ToDoList.svelte';
  import Bin from './lib/Bin.svelte';
  import ItemPanel from './lib/ItemPanel.svelte';
</script>

<main>
  <h1 class="title section">ToDo List</h1>
  <ToDoList/>
  <ItemPanel/>
  <Bin/>
</main>

<style>
  main {
    display: grid;
    grid-template-columns: 50% 50%;
    grid-template-rows: auto 1fr 1fr;
    align-content: center;
    justify-content: center;
    max-width: 100vw;
    max-height: 100vh;
    gap: 20px;
    padding: 40px;
  }
  .title {
    grid-column-start: 1;
    grid-column-end: 3;
    text-align: center;
  }
</style>
