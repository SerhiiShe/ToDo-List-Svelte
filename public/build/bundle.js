
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.52.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/TodoItem.svelte generated by Svelte v3.52.0 */
    const file$4 = "src/TodoItem.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let span;
    	let t0_value = /*index*/ ctx[1] + 1 + "";
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let a;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = text(". ");
    			t2 = text(/*item*/ ctx[0]);
    			t3 = text(";");
    			t4 = space();
    			a = element("a");
    			a.textContent = "Delete";
    			attr_dev(span, "class", "svelte-1gqeqcd");
    			add_location(span, file$4, 14, 4, 258);
    			attr_dev(a, "href", "#");
    			attr_dev(a, "class", "svelte-1gqeqcd");
    			add_location(a, file$4, 15, 4, 296);
    			attr_dev(div, "class", "ti svelte-1gqeqcd");
    			add_location(div, file$4, 13, 0, 237);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(div, t4);
    			append_dev(div, a);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*removeItem*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*index*/ 2 && t0_value !== (t0_value = /*index*/ ctx[1] + 1 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*item*/ 1) set_data_dev(t2, /*item*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodoItem', slots, []);
    	let { item } = $$props;
    	let { index } = $$props;
    	let dispatch = new createEventDispatcher();

    	function removeItem() {
    		dispatch('removeItem', index);
    	}

    	$$self.$$.on_mount.push(function () {
    		if (item === undefined && !('item' in $$props || $$self.$$.bound[$$self.$$.props['item']])) {
    			console.warn("<TodoItem> was created without expected prop 'item'");
    		}

    		if (index === undefined && !('index' in $$props || $$self.$$.bound[$$self.$$.props['index']])) {
    			console.warn("<TodoItem> was created without expected prop 'index'");
    		}
    	});

    	const writable_props = ['item', 'index'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TodoItem> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('item' in $$props) $$invalidate(0, item = $$props.item);
    		if ('index' in $$props) $$invalidate(1, index = $$props.index);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		item,
    		index,
    		dispatch,
    		removeItem
    	});

    	$$self.$inject_state = $$props => {
    		if ('item' in $$props) $$invalidate(0, item = $$props.item);
    		if ('index' in $$props) $$invalidate(1, index = $$props.index);
    		if ('dispatch' in $$props) dispatch = $$props.dispatch;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [item, index, removeItem];
    }

    class TodoItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { item: 0, index: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoItem",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get item() {
    		throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get index() {
    		throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/TodoComment.svelte generated by Svelte v3.52.0 */

    const file$3 = "src/TodoComment.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let span;
    	let t0;
    	let t1;
    	let p;
    	let b;
    	let t3;
    	let br;
    	let t4;
    	let i;
    	let t5_value = (/*comment*/ ctx[0] || '...') + "";
    	let t5;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text(/*todoItemName*/ ctx[1]);
    			t1 = space();
    			p = element("p");
    			b = element("b");
    			b.textContent = "Comment:";
    			t3 = space();
    			br = element("br");
    			t4 = space();
    			i = element("i");
    			t5 = text(t5_value);
    			attr_dev(span, "class", "svelte-xvtoov");
    			add_location(span, file$3, 6, 4, 95);
    			attr_dev(b, "class", "svelte-xvtoov");
    			add_location(b, file$3, 7, 7, 130);
    			add_location(br, file$3, 7, 23, 146);
    			add_location(i, file$3, 7, 28, 151);
    			add_location(p, file$3, 7, 4, 127);
    			attr_dev(div, "class", "tc svelte-xvtoov");
    			add_location(div, file$3, 5, 0, 74);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, b);
    			append_dev(p, t3);
    			append_dev(p, br);
    			append_dev(p, t4);
    			append_dev(p, i);
    			append_dev(i, t5);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*todoItemName*/ 2) set_data_dev(t0, /*todoItemName*/ ctx[1]);
    			if (dirty & /*comment*/ 1 && t5_value !== (t5_value = (/*comment*/ ctx[0] || '...') + "")) set_data_dev(t5, t5_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodoComment', slots, []);
    	let { comment } = $$props;
    	let { todoItemName } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (comment === undefined && !('comment' in $$props || $$self.$$.bound[$$self.$$.props['comment']])) {
    			console.warn("<TodoComment> was created without expected prop 'comment'");
    		}

    		if (todoItemName === undefined && !('todoItemName' in $$props || $$self.$$.bound[$$self.$$.props['todoItemName']])) {
    			console.warn("<TodoComment> was created without expected prop 'todoItemName'");
    		}
    	});

    	const writable_props = ['comment', 'todoItemName'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TodoComment> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('comment' in $$props) $$invalidate(0, comment = $$props.comment);
    		if ('todoItemName' in $$props) $$invalidate(1, todoItemName = $$props.todoItemName);
    	};

    	$$self.$capture_state = () => ({ comment, todoItemName });

    	$$self.$inject_state = $$props => {
    		if ('comment' in $$props) $$invalidate(0, comment = $$props.comment);
    		if ('todoItemName' in $$props) $$invalidate(1, todoItemName = $$props.todoItemName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [comment, todoItemName];
    }

    class TodoComment extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { comment: 0, todoItemName: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoComment",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get comment() {
    		throw new Error("<TodoComment>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set comment(value) {
    		throw new Error("<TodoComment>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get todoItemName() {
    		throw new Error("<TodoComment>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todoItemName(value) {
    		throw new Error("<TodoComment>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/TodoBin.svelte generated by Svelte v3.52.0 */
    const file$2 = "src/TodoBin.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let span;
    	let t0;
    	let t1;
    	let a;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text(/*item*/ ctx[0]);
    			t1 = space();
    			a = element("a");
    			a.textContent = "Restore";
    			attr_dev(span, "class", "svelte-10ss54k");
    			add_location(span, file$2, 13, 4, 259);
    			attr_dev(a, "href", "#");
    			attr_dev(a, "class", "svelte-10ss54k");
    			add_location(a, file$2, 14, 4, 283);
    			attr_dev(div, "class", "tb svelte-10ss54k");
    			add_location(div, file$2, 12, 0, 238);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(div, t1);
    			append_dev(div, a);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*restoreItem*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*item*/ 1) set_data_dev(t0, /*item*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodoBin', slots, []);
    	let { item } = $$props;
    	let { index } = $$props;
    	let dispatch = new createEventDispatcher();

    	function restoreItem() {
    		dispatch('restoreItem', index);
    	}

    	$$self.$$.on_mount.push(function () {
    		if (item === undefined && !('item' in $$props || $$self.$$.bound[$$self.$$.props['item']])) {
    			console.warn("<TodoBin> was created without expected prop 'item'");
    		}

    		if (index === undefined && !('index' in $$props || $$self.$$.bound[$$self.$$.props['index']])) {
    			console.warn("<TodoBin> was created without expected prop 'index'");
    		}
    	});

    	const writable_props = ['item', 'index'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TodoBin> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('item' in $$props) $$invalidate(0, item = $$props.item);
    		if ('index' in $$props) $$invalidate(2, index = $$props.index);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		item,
    		index,
    		dispatch,
    		restoreItem
    	});

    	$$self.$inject_state = $$props => {
    		if ('item' in $$props) $$invalidate(0, item = $$props.item);
    		if ('index' in $$props) $$invalidate(2, index = $$props.index);
    		if ('dispatch' in $$props) dispatch = $$props.dispatch;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [item, restoreItem, index];
    }

    class TodoBin extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { item: 0, index: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoBin",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get item() {
    		throw new Error("<TodoBin>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<TodoBin>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get index() {
    		throw new Error("<TodoBin>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<TodoBin>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/TodoList.svelte generated by Svelte v3.52.0 */
    const file$1 = "src/TodoList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	child_ctx[18] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[18] = i;
    	return child_ctx;
    }

    // (78:8) {#each todos as todo, i}
    function create_each_block_2(ctx) {
    	let a;
    	let todoitem;
    	let t;
    	let a_id_value;
    	let current;
    	let mounted;
    	let dispose;

    	todoitem = new TodoItem({
    			props: {
    				item: /*todo*/ ctx[19].item,
    				index: /*i*/ ctx[18]
    			},
    			$$inline: true
    		});

    	todoitem.$on("removeItem", /*removeItem*/ ctx[8]);

    	const block = {
    		c: function create() {
    			a = element("a");
    			create_component(todoitem.$$.fragment);
    			t = space();
    			attr_dev(a, "class", "tl__item svelte-1k11myf");
    			attr_dev(a, "href", "#");
    			attr_dev(a, "id", a_id_value = /*todo*/ ctx[19].id);
    			add_location(a, file$1, 78, 12, 1854);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			mount_component(todoitem, a, null);
    			append_dev(a, t);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*setActiveItem*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const todoitem_changes = {};
    			if (dirty & /*todos*/ 2) todoitem_changes.item = /*todo*/ ctx[19].item;
    			todoitem.$set(todoitem_changes);

    			if (!current || dirty & /*todos*/ 2 && a_id_value !== (a_id_value = /*todo*/ ctx[19].id)) {
    				attr_dev(a, "id", a_id_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todoitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todoitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			destroy_component(todoitem);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(78:8) {#each todos as todo, i}",
    		ctx
    	});

    	return block;
    }

    // (99:12) {#if todo.id == activeItemId}
    function create_if_block(ctx) {
    	let todocomment;
    	let current;

    	todocomment = new TodoComment({
    			props: {
    				comment: /*todo*/ ctx[19].comment,
    				todoItemName: /*todo*/ ctx[19].item
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(todocomment.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(todocomment, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const todocomment_changes = {};
    			if (dirty & /*todos*/ 2) todocomment_changes.comment = /*todo*/ ctx[19].comment;
    			if (dirty & /*todos*/ 2) todocomment_changes.todoItemName = /*todo*/ ctx[19].item;
    			todocomment.$set(todocomment_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todocomment.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todocomment.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(todocomment, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(99:12) {#if todo.id == activeItemId}",
    		ctx
    	});

    	return block;
    }

    // (98:8) {#each todos as todo}
    function create_each_block_1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*todo*/ ctx[19].id == /*activeItemId*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*todo*/ ctx[19].id == /*activeItemId*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*todos, activeItemId*/ 6) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(98:8) {#each todos as todo}",
    		ctx
    	});

    	return block;
    }

    // (110:8) {#each bin as deletedItem, i}
    function create_each_block(ctx) {
    	let todobin;
    	let current;

    	todobin = new TodoBin({
    			props: {
    				item: /*deletedItem*/ ctx[16].item,
    				index: /*i*/ ctx[18]
    			},
    			$$inline: true
    		});

    	todobin.$on("restoreItem", /*restoreItem*/ ctx[11]);

    	const block = {
    		c: function create() {
    			create_component(todobin.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(todobin, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const todobin_changes = {};
    			if (dirty & /*bin*/ 16) todobin_changes.item = /*deletedItem*/ ctx[16].item;
    			todobin.$set(todobin_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todobin.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todobin.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(todobin, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(110:8) {#each bin as deletedItem, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div3;
    	let h1;
    	let t1;
    	let div0;
    	let input0;
    	let t2;
    	let button0;
    	let t4;
    	let t5;
    	let div1;
    	let input1;
    	let t6;
    	let button1;
    	let t8;
    	let t9;
    	let div2;
    	let button2;
    	let t11;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_2 = /*todos*/ ctx[1];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_2[i], 1, 1, () => {
    		each_blocks_2[i] = null;
    	});

    	let each_value_1 = /*todos*/ ctx[1];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out_1 = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*bin*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out_2 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Todo List";
    			t1 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t2 = space();
    			button0 = element("button");
    			button0.textContent = "Add New Todo Item";
    			t4 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t5 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "Add Comment";
    			t8 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t9 = space();
    			div2 = element("div");
    			button2 = element("button");
    			button2.textContent = "Clear Bin";
    			t11 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "tl__title svelte-1k11myf");
    			add_location(h1, file$1, 66, 4, 1511);
    			attr_dev(input0, "class", "input svelte-1k11myf");
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$1, 69, 8, 1590);
    			attr_dev(button0, "class", "button svelte-1k11myf");
    			add_location(button0, file$1, 75, 8, 1739);
    			attr_dev(div0, "class", "tl__main block svelte-1k11myf");
    			add_location(div0, file$1, 68, 4, 1553);
    			attr_dev(input1, "class", "input svelte-1k11myf");
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$1, 89, 8, 2170);
    			attr_dev(button1, "class", "button svelte-1k11myf");
    			add_location(button1, file$1, 95, 8, 2329);
    			attr_dev(div1, "class", "tl__comment block svelte-1k11myf");
    			add_location(div1, file$1, 88, 4, 2130);
    			attr_dev(button2, "class", "button svelte-1k11myf");
    			add_location(button2, file$1, 108, 8, 2690);
    			attr_dev(div2, "class", "tl__bin block svelte-1k11myf");
    			add_location(div2, file$1, 107, 4, 2654);
    			attr_dev(div3, "class", "tl svelte-1k11myf");
    			add_location(div3, file$1, 65, 0, 1490);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h1);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*newTodo*/ ctx[0]);
    			append_dev(div0, t2);
    			append_dev(div0, button0);
    			append_dev(div0, t4);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div0, null);
    			}

    			append_dev(div3, t5);
    			append_dev(div3, div1);
    			append_dev(div1, input1);
    			set_input_value(input1, /*newComment*/ ctx[3]);
    			append_dev(div1, t6);
    			append_dev(div1, button1);
    			append_dev(div1, t8);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div1, null);
    			}

    			append_dev(div3, t9);
    			append_dev(div3, div2);
    			append_dev(div2, button2);
    			append_dev(div2, t11);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "keydown", /*handleEnterKey*/ ctx[6], false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[13]),
    					listen_dev(button0, "click", /*addTodo*/ ctx[5], false, false, false),
    					listen_dev(input1, "keydown", /*handleEnterKeyComment*/ ctx[7], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[14]),
    					listen_dev(button1, "click", /*addComment*/ ctx[10], false, false, false),
    					listen_dev(button2, "click", /*clearBin*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*newTodo*/ 1 && input0.value !== /*newTodo*/ ctx[0]) {
    				set_input_value(input0, /*newTodo*/ ctx[0]);
    			}

    			if (dirty & /*todos, setActiveItem, removeItem*/ 770) {
    				each_value_2 = /*todos*/ ctx[1];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    						transition_in(each_blocks_2[i], 1);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						transition_in(each_blocks_2[i], 1);
    						each_blocks_2[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_2.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*newComment*/ 8 && input1.value !== /*newComment*/ ctx[3]) {
    				set_input_value(input1, /*newComment*/ ctx[3]);
    			}

    			if (dirty & /*todos, activeItemId*/ 6) {
    				each_value_1 = /*todos*/ ctx[1];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*bin, restoreItem*/ 2064) {
    				each_value = /*bin*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div2, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_2(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_2[i]);
    			}

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_2 = each_blocks_2.filter(Boolean);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				transition_out(each_blocks_2[i]);
    			}

    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodoList', slots, []);
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

    			$$invalidate(1, todos);
    			$$invalidate(0, newTodo = "");
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
    		$$invalidate(1, todos);
    		$$invalidate(4, bin);
    	}

    	function setActiveItem() {
    		$$invalidate(2, activeItemId = this.id);
    	}

    	function addComment() {
    		if (newComment !== "" && activeItemId !== undefined) {
    			todos.forEach(elem => {
    				if (elem.id == activeItemId) elem.comment = newComment;
    			});

    			$$invalidate(1, todos);
    			$$invalidate(3, newComment = "");
    		}
    	}

    	function restoreItem(event) {
    		todos.push(...bin.splice(event.detail, 1));
    		$$invalidate(1, todos);
    		$$invalidate(4, bin);
    	}

    	function clearBin() {
    		$$invalidate(4, bin = []);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TodoList> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		newTodo = this.value;
    		$$invalidate(0, newTodo);
    	}

    	function input1_input_handler() {
    		newComment = this.value;
    		$$invalidate(3, newComment);
    	}

    	$$self.$capture_state = () => ({
    		TodoItem,
    		TodoComment,
    		TodoBin,
    		newTodo,
    		todos,
    		idCounter,
    		activeItemId,
    		newComment,
    		bin,
    		addTodo,
    		handleEnterKey,
    		handleEnterKeyComment,
    		removeItem,
    		setActiveItem,
    		addComment,
    		restoreItem,
    		clearBin
    	});

    	$$self.$inject_state = $$props => {
    		if ('newTodo' in $$props) $$invalidate(0, newTodo = $$props.newTodo);
    		if ('todos' in $$props) $$invalidate(1, todos = $$props.todos);
    		if ('idCounter' in $$props) idCounter = $$props.idCounter;
    		if ('activeItemId' in $$props) $$invalidate(2, activeItemId = $$props.activeItemId);
    		if ('newComment' in $$props) $$invalidate(3, newComment = $$props.newComment);
    		if ('bin' in $$props) $$invalidate(4, bin = $$props.bin);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		newTodo,
    		todos,
    		activeItemId,
    		newComment,
    		bin,
    		addTodo,
    		handleEnterKey,
    		handleEnterKeyComment,
    		removeItem,
    		setActiveItem,
    		addComment,
    		restoreItem,
    		clearBin,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class TodoList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoList",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.52.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let todolist;
    	let current;
    	todolist = new TodoList({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(todolist.$$.fragment);
    			attr_dev(main, "class", "svelte-15dp7zy");
    			add_location(main, file, 4, 0, 63);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(todolist, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todolist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todolist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(todolist);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ TodoList });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		todos: []
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
