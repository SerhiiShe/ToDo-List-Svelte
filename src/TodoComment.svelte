<script>
    export let comment; 
    export let todoItemName;
</script>

<div class="tc">
    <span>{todoItemName}</span>
    <p><b>Comment:</b> <br> <i>{comment || '...'}</i></p>
</div>

<style>
    .tc span {
        font-size: 2em;
        color: rgb(68, 0, 255);
    }
    .tc b {
       color: firebrick;
       line-height: 2em;
    }
</style>