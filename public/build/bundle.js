
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
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

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/specifics/Onourowntime.svelte generated by Svelte v3.23.0 */

    const file = "src/specifics/Onourowntime.svelte";

    function create_fragment(ctx) {
    	let div;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let img2;
    	let img2_src_value;
    	let t2;
    	let img3;
    	let img3_src_value;
    	let t3;
    	let img4;
    	let img4_src_value;
    	let br0;
    	let br1;
    	let br2;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let t4;
    	let img5;
    	let img5_src_value;
    	let t5;
    	let img6;
    	let img6_src_value;
    	let t6;
    	let img7;
    	let img7_src_value;
    	let br8;
    	let br9;
    	let br10;
    	let br11;
    	let br12;
    	let br13;
    	let br14;
    	let br15;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img0 = element("img");
    			t0 = space();
    			img1 = element("img");
    			t1 = space();
    			img2 = element("img");
    			t2 = space();
    			img3 = element("img");
    			t3 = space();
    			img4 = element("img");
    			br0 = element("br");
    			br1 = element("br");
    			br2 = element("br");
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			t4 = space();
    			img5 = element("img");
    			t5 = space();
    			img6 = element("img");
    			t6 = space();
    			img7 = element("img");
    			br8 = element("br");
    			br9 = element("br");
    			br10 = element("br");
    			br11 = element("br");
    			br12 = element("br");
    			br13 = element("br");
    			br14 = element("br");
    			br15 = element("br");
    			attr_dev(img0, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/onourowntime/1.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file, 6, 1, 54);
    			attr_dev(img1, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/onourowntime/3.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file, 7, 1, 131);
    			attr_dev(img2, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/onourowntime/4.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file, 8, 1, 208);
    			attr_dev(img3, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/onourowntime/5.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file, 9, 1, 285);
    			attr_dev(img4, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/onourowntime/2.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file, 10, 1, 362);
    			add_location(br0, file, 10, 76, 437);
    			add_location(br1, file, 10, 80, 441);
    			add_location(br2, file, 10, 84, 445);
    			add_location(br3, file, 10, 88, 449);
    			add_location(br4, file, 10, 92, 453);
    			add_location(br5, file, 10, 96, 457);
    			add_location(br6, file, 10, 100, 461);
    			add_location(br7, file, 10, 104, 465);
    			attr_dev(img5, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/onourowntime/a.jpg")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file, 11, 1, 471);
    			attr_dev(img6, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/onourowntime/b.jpg")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file, 12, 1, 548);
    			attr_dev(img7, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/onourowntime/c.jpg")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file, 13, 1, 625);
    			add_location(br8, file, 13, 76, 700);
    			add_location(br9, file, 13, 80, 704);
    			add_location(br10, file, 13, 84, 708);
    			add_location(br11, file, 13, 88, 712);
    			add_location(br12, file, 13, 92, 716);
    			add_location(br13, file, 13, 96, 720);
    			add_location(br14, file, 13, 100, 724);
    			add_location(br15, file, 13, 104, 728);
    			attr_dev(div, "class", "backgroundcolor svelte-1phlr82");
    			add_location(div, file, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img0);
    			append_dev(div, t0);
    			append_dev(div, img1);
    			append_dev(div, t1);
    			append_dev(div, img2);
    			append_dev(div, t2);
    			append_dev(div, img3);
    			append_dev(div, t3);
    			append_dev(div, img4);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, br2);
    			append_dev(div, br3);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, t4);
    			append_dev(div, img5);
    			append_dev(div, t5);
    			append_dev(div, img6);
    			append_dev(div, t6);
    			append_dev(div, img7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, br12);
    			append_dev(div, br13);
    			append_dev(div, br14);
    			append_dev(div, br15);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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

    function instance($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Onourowntime> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Onourowntime", $$slots, []);
    	return [];
    }

    class Onourowntime extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Onourowntime",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/specifics/Green.svelte generated by Svelte v3.23.0 */

    const file$1 = "src/specifics/Green.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br2;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let br3;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let br4;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let br5;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let br6;
    	let t6;
    	let video;
    	let source;
    	let source_src_value;
    	let t7;
    	let br7;
    	let t8;
    	let img6;
    	let img6_src_value;
    	let br8;
    	let t9;
    	let img7;
    	let img7_src_value;
    	let br9;
    	let t10;
    	let img8;
    	let img8_src_value;
    	let br10;
    	let t11;
    	let img9;
    	let img9_src_value;
    	let br11;
    	let t12;
    	let img10;
    	let img10_src_value;
    	let br12;
    	let t13;
    	let img11;
    	let img11_src_value;
    	let t14;
    	let br13;
    	let br14;
    	let br15;
    	let br16;
    	let br17;
    	let br18;
    	let br19;
    	let br20;
    	let t15;
    	let img12;
    	let img12_src_value;
    	let t16;
    	let img13;
    	let img13_src_value;
    	let br21;
    	let t17;
    	let img14;
    	let img14_src_value;
    	let t18;
    	let img15;
    	let img15_src_value;
    	let t19;
    	let img16;
    	let img16_src_value;
    	let t20;
    	let br22;
    	let br23;
    	let br24;
    	let br25;
    	let br26;
    	let br27;
    	let br28;
    	let br29;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			br2 = element("br");
    			t2 = space();
    			img2 = element("img");
    			br3 = element("br");
    			t3 = space();
    			img3 = element("img");
    			br4 = element("br");
    			t4 = space();
    			img4 = element("img");
    			br5 = element("br");
    			t5 = space();
    			img5 = element("img");
    			br6 = element("br");
    			t6 = space();
    			video = element("video");
    			source = element("source");
    			t7 = text("\n  \t\tYour browser does not support HTML video.\n\t");
    			br7 = element("br");
    			t8 = space();
    			img6 = element("img");
    			br8 = element("br");
    			t9 = space();
    			img7 = element("img");
    			br9 = element("br");
    			t10 = space();
    			img8 = element("img");
    			br10 = element("br");
    			t11 = space();
    			img9 = element("img");
    			br11 = element("br");
    			t12 = space();
    			img10 = element("img");
    			br12 = element("br");
    			t13 = space();
    			img11 = element("img");
    			t14 = space();
    			br13 = element("br");
    			br14 = element("br");
    			br15 = element("br");
    			br16 = element("br");
    			br17 = element("br");
    			br18 = element("br");
    			br19 = element("br");
    			br20 = element("br");
    			t15 = space();
    			img12 = element("img");
    			t16 = space();
    			img13 = element("img");
    			br21 = element("br");
    			t17 = space();
    			img14 = element("img");
    			t18 = space();
    			img15 = element("img");
    			t19 = space();
    			img16 = element("img");
    			t20 = space();
    			br22 = element("br");
    			br23 = element("br");
    			br24 = element("br");
    			br25 = element("br");
    			br26 = element("br");
    			br27 = element("br");
    			br28 = element("br");
    			br29 = element("br");
    			add_location(br0, file$1, 6, 1, 54);
    			add_location(br1, file$1, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/thesis/1smaller.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$1, 7, 1, 64);
    			attr_dev(img1, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/thesis/2smaller.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$1, 8, 1, 142);
    			add_location(br2, file$1, 8, 77, 218);
    			attr_dev(img2, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/thesis/cover.gif")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$1, 9, 1, 224);
    			add_location(br3, file$1, 9, 74, 297);
    			attr_dev(img3, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/thesis/3smaller.jpg")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$1, 11, 1, 304);
    			add_location(br4, file$1, 11, 77, 380);
    			attr_dev(img4, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/thesis/4smaller.jpg")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$1, 12, 1, 386);
    			add_location(br5, file$1, 12, 77, 462);
    			attr_dev(img5, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/thesis/6smaller.jpg")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$1, 14, 1, 470);
    			add_location(br6, file$1, 14, 77, 546);
    			if (source.src !== (source_src_value = "igms/thesis/green6.mp4")) attr_dev(source, "src", source_src_value);
    			attr_dev(source, "type", "video/mp4");
    			add_location(source, file$1, 16, 3, 625);
    			attr_dev(video, "class", "img portfolio-item");
    			attr_dev(video, "width", "400");
    			video.controls = true;
    			video.autoplay = true;
    			video.loop = true;
    			add_location(video, file$1, 15, 1, 552);
    			add_location(br7, file$1, 18, 9, 735);
    			attr_dev(img6, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/thesis/7smaller.jpg")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$1, 19, 1, 741);
    			add_location(br8, file$1, 19, 77, 817);
    			attr_dev(img7, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/thesis/9smaller.jpg")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$1, 20, 1, 823);
    			add_location(br9, file$1, 20, 77, 899);
    			attr_dev(img8, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/thesis/10smaller2.jpg")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$1, 21, 1, 905);
    			add_location(br10, file$1, 21, 79, 983);
    			attr_dev(img9, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img9, "alt", "mynd");
    			if (img9.src !== (img9_src_value = "igms/thesis/11smaller3.jpg")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$1, 22, 1, 989);
    			add_location(br11, file$1, 22, 79, 1067);
    			attr_dev(img10, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img10, "alt", "mynd");
    			if (img10.src !== (img10_src_value = "igms/thesis/12smaller.jpg")) attr_dev(img10, "src", img10_src_value);
    			add_location(img10, file$1, 24, 1, 1075);
    			add_location(br12, file$1, 24, 78, 1152);
    			attr_dev(img11, "class", "img portfolio-item svelte-4zfd0m");
    			attr_dev(img11, "alt", "mynd");
    			if (img11.src !== (img11_src_value = "igms/thesis/krisa.jpg")) attr_dev(img11, "src", img11_src_value);
    			add_location(img11, file$1, 28, 1, 1323);
    			add_location(br13, file$1, 29, 1, 1398);
    			add_location(br14, file$1, 29, 5, 1402);
    			add_location(br15, file$1, 29, 9, 1406);
    			add_location(br16, file$1, 29, 13, 1410);
    			add_location(br17, file$1, 29, 17, 1414);
    			add_location(br18, file$1, 29, 21, 1418);
    			add_location(br19, file$1, 29, 25, 1422);
    			add_location(br20, file$1, 29, 29, 1426);
    			attr_dev(img12, "class", "img smaller portfolio-item svelte-4zfd0m");
    			attr_dev(img12, "alt", "mynd");
    			if (img12.src !== (img12_src_value = "igms/thesis/mobile2.jpg")) attr_dev(img12, "src", img12_src_value);
    			add_location(img12, file$1, 31, 1, 1524);
    			attr_dev(img13, "class", "img smaller portfolio-item svelte-4zfd0m");
    			attr_dev(img13, "alt", "mynd");
    			if (img13.src !== (img13_src_value = "igms/thesis/mobile3.jpg")) attr_dev(img13, "src", img13_src_value);
    			add_location(img13, file$1, 32, 1, 1609);
    			add_location(br21, file$1, 32, 84, 1692);
    			attr_dev(img14, "class", "img smaller portfolio-item svelte-4zfd0m");
    			attr_dev(img14, "alt", "mynd");
    			if (img14.src !== (img14_src_value = "igms/thesis/mobile4.jpg")) attr_dev(img14, "src", img14_src_value);
    			add_location(img14, file$1, 33, 1, 1698);
    			attr_dev(img15, "class", "img smaller portfolio-item svelte-4zfd0m");
    			attr_dev(img15, "alt", "mynd");
    			if (img15.src !== (img15_src_value = "igms/thesis/mobile5.jpg")) attr_dev(img15, "src", img15_src_value);
    			add_location(img15, file$1, 34, 1, 1783);
    			attr_dev(img16, "class", "img smaller portfolio-item svelte-4zfd0m");
    			attr_dev(img16, "alt", "mynd");
    			if (img16.src !== (img16_src_value = "igms/thesis/mobile6.jpg")) attr_dev(img16, "src", img16_src_value);
    			add_location(img16, file$1, 35, 1, 1868);
    			add_location(br22, file$1, 36, 1, 1953);
    			add_location(br23, file$1, 36, 5, 1957);
    			add_location(br24, file$1, 36, 9, 1961);
    			add_location(br25, file$1, 36, 13, 1965);
    			add_location(br26, file$1, 36, 17, 1969);
    			add_location(br27, file$1, 36, 21, 1973);
    			add_location(br28, file$1, 36, 25, 1977);
    			add_location(br29, file$1, 36, 29, 1981);
    			attr_dev(div, "class", "backgroundcolor svelte-4zfd0m");
    			add_location(div, file$1, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, br2);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, br3);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, br4);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, br5);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, br6);
    			append_dev(div, t6);
    			append_dev(div, video);
    			append_dev(video, source);
    			append_dev(video, t7);
    			append_dev(div, br7);
    			append_dev(div, t8);
    			append_dev(div, img6);
    			append_dev(div, br8);
    			append_dev(div, t9);
    			append_dev(div, img7);
    			append_dev(div, br9);
    			append_dev(div, t10);
    			append_dev(div, img8);
    			append_dev(div, br10);
    			append_dev(div, t11);
    			append_dev(div, img9);
    			append_dev(div, br11);
    			append_dev(div, t12);
    			append_dev(div, img10);
    			append_dev(div, br12);
    			append_dev(div, t13);
    			append_dev(div, img11);
    			append_dev(div, t14);
    			append_dev(div, br13);
    			append_dev(div, br14);
    			append_dev(div, br15);
    			append_dev(div, br16);
    			append_dev(div, br17);
    			append_dev(div, br18);
    			append_dev(div, br19);
    			append_dev(div, br20);
    			append_dev(div, t15);
    			append_dev(div, img12);
    			append_dev(div, t16);
    			append_dev(div, img13);
    			append_dev(div, br21);
    			append_dev(div, t17);
    			append_dev(div, img14);
    			append_dev(div, t18);
    			append_dev(div, img15);
    			append_dev(div, t19);
    			append_dev(div, img16);
    			append_dev(div, t20);
    			append_dev(div, br22);
    			append_dev(div, br23);
    			append_dev(div, br24);
    			append_dev(div, br25);
    			append_dev(div, br26);
    			append_dev(div, br27);
    			append_dev(div, br28);
    			append_dev(div, br29);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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

    function instance$1($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Green> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Green", $$slots, []);
    	return [];
    }

    class Green extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Green",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/specifics/Vivienne.svelte generated by Svelte v3.23.0 */

    const file$2 = "src/specifics/Vivienne.svelte";

    function create_fragment$2(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let iframe;
    	let iframe_src_value;
    	let t0;
    	let script;
    	let script_src_value;
    	let t1;
    	let img;
    	let img_src_value;
    	let t2;
    	let br0;
    	let br1;
    	let br2;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			iframe = element("iframe");
    			t0 = space();
    			script = element("script");
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			br0 = element("br");
    			br1 = element("br");
    			br2 = element("br");
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			attr_dev(iframe, "title", "book");
    			if (iframe.src !== (iframe_src_value = "https://player.vimeo.com/video/331654391?autoplay=1&loop=1&title=0&byline=0&portrait=0")) attr_dev(iframe, "src", iframe_src_value);
    			set_style(iframe, "position", "absolute");
    			set_style(iframe, "top", "0");
    			set_style(iframe, "left", "0");
    			set_style(iframe, "width", "100%");
    			set_style(iframe, "height", "100%");
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "allow", "autoplay; fullscreen");
    			iframe.allowFullscreen = true;
    			add_location(iframe, file$2, 14, 6, 249);
    			set_style(div0, "padding", "36.16% 0 0 0");
    			set_style(div0, "position", "relative");
    			add_location(div0, file$2, 13, 5, 189);
    			if (script.src !== (script_src_value = "https://player.vimeo.com/api/player.js")) attr_dev(script, "src", script_src_value);
    			add_location(script, file$2, 16, 5, 514);
    			set_style(div1, "position", "absolute");
    			set_style(div1, "top", "20%");
    			set_style(div1, "left", "2%");
    			set_style(div1, "right", "2%");
    			set_style(div1, "height", "auto");
    			set_style(div1, "padding-bottom", "2%");
    			add_location(div1, file$2, 6, 1, 54);
    			attr_dev(img, "class", "img svelte-14uybv5");
    			attr_dev(img, "alt", "mynd");
    			if (img.src !== (img_src_value = "igms/viv/poster.jpg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file$2, 18, 1, 586);
    			add_location(br0, file$2, 19, 1, 644);
    			add_location(br1, file$2, 19, 5, 648);
    			add_location(br2, file$2, 19, 9, 652);
    			add_location(br3, file$2, 19, 13, 656);
    			add_location(br4, file$2, 19, 17, 660);
    			add_location(br5, file$2, 19, 21, 664);
    			add_location(br6, file$2, 19, 25, 668);
    			add_location(br7, file$2, 19, 29, 672);
    			attr_dev(div2, "class", "backgroundcolor svelte-14uybv5");
    			add_location(div2, file$2, 4, 0, 22);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, iframe);
    			append_dev(div1, t0);
    			append_dev(div1, script);
    			append_dev(div2, t1);
    			append_dev(div2, img);
    			append_dev(div2, t2);
    			append_dev(div2, br0);
    			append_dev(div2, br1);
    			append_dev(div2, br2);
    			append_dev(div2, br3);
    			append_dev(div2, br4);
    			append_dev(div2, br5);
    			append_dev(div2, br6);
    			append_dev(div2, br7);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
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

    function instance$2($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Vivienne> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Vivienne", $$slots, []);
    	return [];
    }

    class Vivienne extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Vivienne",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/specifics/Portfolioio.svelte generated by Svelte v3.23.0 */

    const file$3 = "src/specifics/Portfolioio.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let br2;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br3;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let br4;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let br5;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let br6;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let br7;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let t7;
    	let img7;
    	let img7_src_value;
    	let br8;
    	let t8;
    	let img8;
    	let img8_src_value;
    	let t9;
    	let img9;
    	let img9_src_value;
    	let t10;
    	let br9;
    	let br10;
    	let br11;
    	let br12;
    	let br13;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			br2 = element("br");
    			t1 = space();
    			img1 = element("img");
    			br3 = element("br");
    			t2 = space();
    			img2 = element("img");
    			br4 = element("br");
    			t3 = space();
    			img3 = element("img");
    			br5 = element("br");
    			t4 = space();
    			img4 = element("img");
    			br6 = element("br");
    			t5 = space();
    			img5 = element("img");
    			br7 = element("br");
    			t6 = space();
    			img6 = element("img");
    			t7 = space();
    			img7 = element("img");
    			br8 = element("br");
    			t8 = space();
    			img8 = element("img");
    			t9 = space();
    			img9 = element("img");
    			t10 = space();
    			br9 = element("br");
    			br10 = element("br");
    			br11 = element("br");
    			br12 = element("br");
    			br13 = element("br");
    			add_location(br0, file$3, 6, 1, 54);
    			add_location(br1, file$3, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-13rl728");
    			if (img0.src !== (img0_src_value = "igms/io/1.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$3, 8, 1, 66);
    			add_location(br2, file$3, 8, 55, 120);
    			attr_dev(img1, "class", "img portfolio-item svelte-13rl728");
    			if (img1.src !== (img1_src_value = "igms/io/2.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$3, 9, 1, 126);
    			add_location(br3, file$3, 9, 55, 180);
    			attr_dev(img2, "class", "img portfolio-item svelte-13rl728");
    			if (img2.src !== (img2_src_value = "igms/io/3.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$3, 10, 1, 186);
    			add_location(br4, file$3, 10, 55, 240);
    			attr_dev(img3, "class", "img portfolio-item svelte-13rl728");
    			if (img3.src !== (img3_src_value = "igms/io/5.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$3, 12, 1, 313);
    			add_location(br5, file$3, 12, 55, 367);
    			attr_dev(img4, "class", "img portfolio-item svelte-13rl728");
    			if (img4.src !== (img4_src_value = "igms/io/6.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$3, 13, 1, 373);
    			add_location(br6, file$3, 13, 55, 427);
    			attr_dev(img5, "class", "img portfolio-item svelte-13rl728");
    			if (img5.src !== (img5_src_value = "igms/io/7.png")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$3, 14, 1, 433);
    			add_location(br7, file$3, 14, 55, 487);
    			attr_dev(img6, "class", "img portfolio-item svelte-13rl728");
    			if (img6.src !== (img6_src_value = "igms/io/8.png")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$3, 15, 1, 493);
    			attr_dev(img7, "class", "img portfolio-item svelte-13rl728");
    			if (img7.src !== (img7_src_value = "igms/io/allblurred10.png")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$3, 16, 1, 549);
    			add_location(br8, file$3, 16, 66, 614);
    			attr_dev(img8, "class", "img portfolio-item svelte-13rl728");
    			if (img8.src !== (img8_src_value = "igms/io/9.jpg")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$3, 17, 1, 620);
    			attr_dev(img9, "class", "img portfolio-item svelte-13rl728");
    			if (img9.src !== (img9_src_value = "igms/io/10.jpg")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$3, 18, 1, 676);
    			add_location(br9, file$3, 19, 1, 733);
    			add_location(br10, file$3, 19, 5, 737);
    			add_location(br11, file$3, 19, 9, 741);
    			add_location(br12, file$3, 19, 13, 745);
    			add_location(br13, file$3, 19, 17, 749);
    			attr_dev(div, "class", "backgroundcolor svelte-13rl728");
    			add_location(div, file$3, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, br2);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, br3);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, br4);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, br5);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, br6);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, br7);
    			append_dev(div, t6);
    			append_dev(div, img6);
    			append_dev(div, t7);
    			append_dev(div, img7);
    			append_dev(div, br8);
    			append_dev(div, t8);
    			append_dev(div, img8);
    			append_dev(div, t9);
    			append_dev(div, img9);
    			append_dev(div, t10);
    			append_dev(div, br9);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, br12);
    			append_dev(div, br13);
    		},
    		p: noop,
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

    function instance$3($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Portfolioio> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Portfolioio", $$slots, []);
    	return [];
    }

    class Portfolioio extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Portfolioio",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/specifics/Typoposters.svelte generated by Svelte v3.23.0 */

    const file$4 = "src/specifics/Typoposters.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let br2;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br3;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let br4;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let br5;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let br6;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let br7;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let br8;
    	let t7;
    	let img7;
    	let img7_src_value;
    	let br9;
    	let t8;
    	let br10;
    	let br11;
    	let br12;
    	let br13;
    	let br14;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			br2 = element("br");
    			t1 = space();
    			img1 = element("img");
    			br3 = element("br");
    			t2 = space();
    			img2 = element("img");
    			br4 = element("br");
    			t3 = space();
    			img3 = element("img");
    			br5 = element("br");
    			t4 = space();
    			img4 = element("img");
    			br6 = element("br");
    			t5 = space();
    			img5 = element("img");
    			br7 = element("br");
    			t6 = space();
    			img6 = element("img");
    			br8 = element("br");
    			t7 = space();
    			img7 = element("img");
    			br9 = element("br");
    			t8 = space();
    			br10 = element("br");
    			br11 = element("br");
    			br12 = element("br");
    			br13 = element("br");
    			br14 = element("br");
    			add_location(br0, file$4, 6, 1, 54);
    			add_location(br1, file$4, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-1n8gjtn");
    			if (img0.src !== (img0_src_value = "igms/typoPosters/3.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$4, 7, 1, 64);
    			add_location(br2, file$4, 7, 73, 136);
    			attr_dev(img1, "class", "img portfolio-item svelte-1n8gjtn");
    			if (img1.src !== (img1_src_value = "igms/typoPosters/7.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$4, 8, 1, 142);
    			add_location(br3, file$4, 8, 73, 214);
    			attr_dev(img2, "class", "img portfolio-item svelte-1n8gjtn");
    			if (img2.src !== (img2_src_value = "igms/typoPosters/4.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$4, 9, 1, 220);
    			add_location(br4, file$4, 9, 73, 292);
    			attr_dev(img3, "class", "img portfolio-item svelte-1n8gjtn");
    			if (img3.src !== (img3_src_value = "igms/typoPosters/puffwind2.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$4, 10, 1, 298);
    			add_location(br5, file$4, 10, 72, 369);
    			attr_dev(img4, "class", "img portfolio-item svelte-1n8gjtn");
    			if (img4.src !== (img4_src_value = "igms/typoPosters/1.jpg")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$4, 11, 1, 375);
    			add_location(br6, file$4, 11, 73, 447);
    			attr_dev(img5, "class", "img portfolio-item smaller svelte-1n8gjtn");
    			if (img5.src !== (img5_src_value = "igms/typoPosters/arial2.png")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$4, 13, 1, 534);
    			add_location(br7, file$4, 13, 77, 610);
    			attr_dev(img6, "class", "img portfolio-item svelte-1n8gjtn");
    			if (img6.src !== (img6_src_value = "igms/typoPosters/5.jpg")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$4, 14, 1, 616);
    			add_location(br8, file$4, 14, 73, 688);
    			attr_dev(img7, "class", "img portfolio-item svelte-1n8gjtn");
    			if (img7.src !== (img7_src_value = "igms/typoPosters/2.jpg")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$4, 15, 1, 694);
    			add_location(br9, file$4, 15, 73, 766);
    			add_location(br10, file$4, 16, 1, 772);
    			add_location(br11, file$4, 16, 5, 776);
    			add_location(br12, file$4, 16, 9, 780);
    			add_location(br13, file$4, 16, 13, 784);
    			add_location(br14, file$4, 16, 17, 788);
    			attr_dev(div, "class", "backgroundcolor svelte-1n8gjtn");
    			add_location(div, file$4, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, br2);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, br3);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, br4);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, br5);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, br6);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, br7);
    			append_dev(div, t6);
    			append_dev(div, img6);
    			append_dev(div, br8);
    			append_dev(div, t7);
    			append_dev(div, img7);
    			append_dev(div, br9);
    			append_dev(div, t8);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, br12);
    			append_dev(div, br13);
    			append_dev(div, br14);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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

    function instance$4($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Typoposters> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Typoposters", $$slots, []);
    	return [];
    }

    class Typoposters extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Typoposters",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/specifics/Secret.svelte generated by Svelte v3.23.0 */

    const file$5 = "src/specifics/Secret.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let t5;
    	let br2;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			t2 = space();
    			img2 = element("img");
    			t3 = space();
    			img3 = element("img");
    			t4 = space();
    			img4 = element("img");
    			t5 = space();
    			br2 = element("br");
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			add_location(br0, file$5, 6, 1, 54);
    			add_location(br1, file$5, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/secret/front.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$5, 7, 1, 64);
    			attr_dev(img1, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/secret/2.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$5, 9, 1, 237);
    			attr_dev(img2, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/secret/3.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$5, 10, 1, 316);
    			attr_dev(img3, "class", "img portfolio-item svelte-197gr3d");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/secret/4.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$5, 11, 1, 395);
    			attr_dev(img4, "class", "img portfolio-item svelte-197gr3d");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/secret/5.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$5, 13, 1, 468);
    			add_location(br2, file$5, 14, 1, 539);
    			add_location(br3, file$5, 14, 5, 543);
    			add_location(br4, file$5, 14, 9, 547);
    			add_location(br5, file$5, 14, 13, 551);
    			add_location(br6, file$5, 14, 17, 555);
    			add_location(br7, file$5, 14, 21, 559);
    			add_location(br8, file$5, 14, 25, 563);
    			add_location(br9, file$5, 14, 29, 567);
    			attr_dev(div, "class", "backgroundcolor svelte-197gr3d");
    			add_location(div, file$5, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, t5);
    			append_dev(div, br2);
    			append_dev(div, br3);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Secret> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Secret", $$slots, []);
    	return [];
    }

    class Secret extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Secret",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/specifics/sorted-plastic.svelte generated by Svelte v3.23.0 */

    const file$6 = "src/specifics/sorted-plastic.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br2;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let t7;
    	let img7;
    	let img7_src_value;
    	let t8;
    	let img8;
    	let img8_src_value;
    	let t9;
    	let img9;
    	let img9_src_value;
    	let br3;
    	let t10;
    	let img10;
    	let img10_src_value;
    	let t11;
    	let img11;
    	let img11_src_value;
    	let t12;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;
    	let br10;
    	let br11;
    	let t13;
    	let img12;
    	let img12_src_value;
    	let t14;
    	let img13;
    	let img13_src_value;
    	let t15;
    	let br12;
    	let br13;
    	let br14;
    	let br15;
    	let br16;
    	let br17;
    	let br18;
    	let br19;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			br2 = element("br");
    			t2 = space();
    			img2 = element("img");
    			t3 = space();
    			img3 = element("img");
    			t4 = space();
    			img4 = element("img");
    			t5 = space();
    			img5 = element("img");
    			t6 = space();
    			img6 = element("img");
    			t7 = space();
    			img7 = element("img");
    			t8 = space();
    			img8 = element("img");
    			t9 = space();
    			img9 = element("img");
    			br3 = element("br");
    			t10 = space();
    			img10 = element("img");
    			t11 = space();
    			img11 = element("img");
    			t12 = space();
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			br10 = element("br");
    			br11 = element("br");
    			t13 = space();
    			img12 = element("img");
    			t14 = space();
    			img13 = element("img");
    			t15 = space();
    			br12 = element("br");
    			br13 = element("br");
    			br14 = element("br");
    			br15 = element("br");
    			br16 = element("br");
    			br17 = element("br");
    			br18 = element("br");
    			br19 = element("br");
    			add_location(br0, file$6, 6, 1, 54);
    			add_location(br1, file$6, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-1y06s13");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/sortedPlastic/front.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$6, 7, 1, 64);
    			attr_dev(img1, "class", "img portfolio-item svelte-1y06s13");
    			set_style(img1, "border-radius", "30px");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/sortedPlastic/intro.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$6, 8, 1, 146);
    			add_location(br2, file$6, 8, 110, 255);
    			attr_dev(img2, "class", "img portfolio-item svelte-1y06s13");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/sortedPlastic/3-4.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$6, 9, 1, 261);
    			attr_dev(img3, "class", "img portfolio-item svelte-1y06s13");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/sortedPlastic/5-6.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$6, 10, 1, 341);
    			attr_dev(img4, "class", "img portfolio-item svelte-1y06s13");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/sortedPlastic/8-9.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$6, 11, 1, 421);
    			attr_dev(img5, "class", "img portfolio-item svelte-1y06s13");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/sortedPlastic/11-12.png")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$6, 12, 1, 501);
    			attr_dev(img6, "class", "img portfolio-item svelte-1y06s13");
    			set_style(img6, "border-radius", "30px");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/sortedPlastic/detail.jpg")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$6, 13, 1, 583);
    			attr_dev(img7, "class", "img portfolio-item svelte-1y06s13");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/sortedPlastic/14-15.png")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$6, 14, 1, 695);
    			attr_dev(img8, "class", "img portfolio-item svelte-1y06s13");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/sortedPlastic/17-18.png")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$6, 15, 1, 777);
    			attr_dev(img9, "class", "img portfolio-item svelte-1y06s13");
    			attr_dev(img9, "alt", "mynd");
    			if (img9.src !== (img9_src_value = "igms/sortedPlastic/20-21.png")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$6, 16, 1, 859);
    			add_location(br3, file$6, 16, 81, 939);
    			attr_dev(img10, "class", "img portfolio-item svelte-1y06s13");
    			set_style(img10, "border-radius", "30px");
    			attr_dev(img10, "alt", "mynd");
    			if (img10.src !== (img10_src_value = "igms/sortedPlastic/lol.jpg")) attr_dev(img10, "src", img10_src_value);
    			add_location(img10, file$6, 17, 1, 945);
    			attr_dev(img11, "class", "img portfolio-item svelte-1y06s13");
    			attr_dev(img11, "alt", "mynd");
    			if (img11.src !== (img11_src_value = "igms/sortedPlastic/back.png")) attr_dev(img11, "src", img11_src_value);
    			add_location(img11, file$6, 18, 1, 1054);
    			add_location(br4, file$6, 19, 1, 1135);
    			add_location(br5, file$6, 19, 5, 1139);
    			add_location(br6, file$6, 19, 9, 1143);
    			add_location(br7, file$6, 19, 13, 1147);
    			add_location(br8, file$6, 19, 17, 1151);
    			add_location(br9, file$6, 19, 21, 1155);
    			add_location(br10, file$6, 19, 25, 1159);
    			add_location(br11, file$6, 19, 29, 1163);
    			attr_dev(img12, "class", "img portfolio-item smaller svelte-1y06s13");
    			attr_dev(img12, "alt", "mynd");
    			if (img12.src !== (img12_src_value = "igms/sortedPlastic/leikur1.png")) attr_dev(img12, "src", img12_src_value);
    			add_location(img12, file$6, 20, 1, 1169);
    			attr_dev(img13, "class", "img portfolio-item smaller svelte-1y06s13");
    			attr_dev(img13, "alt", "mynd");
    			if (img13.src !== (img13_src_value = "igms/sortedPlastic/leikur2.png")) attr_dev(img13, "src", img13_src_value);
    			add_location(img13, file$6, 21, 1, 1261);
    			add_location(br12, file$6, 22, 1, 1353);
    			add_location(br13, file$6, 22, 5, 1357);
    			add_location(br14, file$6, 22, 9, 1361);
    			add_location(br15, file$6, 22, 13, 1365);
    			add_location(br16, file$6, 22, 17, 1369);
    			add_location(br17, file$6, 22, 21, 1373);
    			add_location(br18, file$6, 22, 25, 1377);
    			add_location(br19, file$6, 22, 29, 1381);
    			attr_dev(div, "class", "backgroundcolor svelte-1y06s13");
    			add_location(div, file$6, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, br2);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, t6);
    			append_dev(div, img6);
    			append_dev(div, t7);
    			append_dev(div, img7);
    			append_dev(div, t8);
    			append_dev(div, img8);
    			append_dev(div, t9);
    			append_dev(div, img9);
    			append_dev(div, br3);
    			append_dev(div, t10);
    			append_dev(div, img10);
    			append_dev(div, t11);
    			append_dev(div, img11);
    			append_dev(div, t12);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, t13);
    			append_dev(div, img12);
    			append_dev(div, t14);
    			append_dev(div, img13);
    			append_dev(div, t15);
    			append_dev(div, br12);
    			append_dev(div, br13);
    			append_dev(div, br14);
    			append_dev(div, br15);
    			append_dev(div, br16);
    			append_dev(div, br17);
    			append_dev(div, br18);
    			append_dev(div, br19);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Sorted_plastic> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Sorted_plastic", $$slots, []);
    	return [];
    }

    class Sorted_plastic extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sorted_plastic",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/specifics/musicposters.svelte generated by Svelte v3.23.0 */

    const file$7 = "src/specifics/musicposters.svelte";

    function create_fragment$7(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br2;
    	let t2;
    	let iframe0;
    	let iframe0_src_value;
    	let t3;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;
    	let br10;
    	let t4;
    	let img2;
    	let img2_src_value;
    	let t5;
    	let img3;
    	let img3_src_value;
    	let br11;
    	let t6;
    	let iframe1;
    	let iframe1_src_value;
    	let t7;
    	let br12;
    	let br13;
    	let br14;
    	let br15;
    	let br16;
    	let br17;
    	let br18;
    	let br19;
    	let t8;
    	let img4;
    	let img4_src_value;
    	let t9;
    	let img5;
    	let img5_src_value;
    	let br20;
    	let t10;
    	let iframe2;
    	let iframe2_src_value;
    	let t11;
    	let br21;
    	let br22;
    	let br23;
    	let br24;
    	let br25;
    	let br26;
    	let br27;
    	let br28;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			br2 = element("br");
    			t2 = space();
    			iframe0 = element("iframe");
    			t3 = space();
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			br10 = element("br");
    			t4 = space();
    			img2 = element("img");
    			t5 = space();
    			img3 = element("img");
    			br11 = element("br");
    			t6 = space();
    			iframe1 = element("iframe");
    			t7 = space();
    			br12 = element("br");
    			br13 = element("br");
    			br14 = element("br");
    			br15 = element("br");
    			br16 = element("br");
    			br17 = element("br");
    			br18 = element("br");
    			br19 = element("br");
    			t8 = space();
    			img4 = element("img");
    			t9 = space();
    			img5 = element("img");
    			br20 = element("br");
    			t10 = space();
    			iframe2 = element("iframe");
    			t11 = space();
    			br21 = element("br");
    			br22 = element("br");
    			br23 = element("br");
    			br24 = element("br");
    			br25 = element("br");
    			br26 = element("br");
    			br27 = element("br");
    			br28 = element("br");
    			add_location(br0, file$7, 6, 1, 54);
    			add_location(br1, file$7, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-vso4qw");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/musicPosters/1.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$7, 7, 1, 64);
    			attr_dev(img1, "class", "img portfolio-item svelte-vso4qw");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/musicPosters/1b.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$7, 8, 1, 141);
    			add_location(br2, file$7, 8, 77, 217);
    			attr_dev(iframe0, "width", "560");
    			attr_dev(iframe0, "height", "315");
    			if (iframe0.src !== (iframe0_src_value = "https://www.youtube.com/embed/Lc0i2iDuAfE")) attr_dev(iframe0, "src", iframe0_src_value);
    			attr_dev(iframe0, "frameborder", "0");
    			attr_dev(iframe0, "allow", "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture");
    			iframe0.allowFullscreen = true;
    			add_location(iframe0, file$7, 9, 1, 223);
    			add_location(br3, file$7, 10, 1, 427);
    			add_location(br4, file$7, 10, 5, 431);
    			add_location(br5, file$7, 10, 9, 435);
    			add_location(br6, file$7, 10, 13, 439);
    			add_location(br7, file$7, 10, 17, 443);
    			add_location(br8, file$7, 10, 21, 447);
    			add_location(br9, file$7, 10, 25, 451);
    			add_location(br10, file$7, 10, 29, 455);
    			attr_dev(img2, "class", "img portfolio-item svelte-vso4qw");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/musicPosters/2.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$7, 11, 1, 461);
    			attr_dev(img3, "class", "img portfolio-item svelte-vso4qw");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/musicPosters/2b.jpg")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$7, 12, 1, 538);
    			add_location(br11, file$7, 12, 77, 614);
    			attr_dev(iframe1, "width", "560");
    			attr_dev(iframe1, "height", "315");
    			if (iframe1.src !== (iframe1_src_value = "https://www.youtube.com/embed/UKt-zMH8c3c")) attr_dev(iframe1, "src", iframe1_src_value);
    			attr_dev(iframe1, "frameborder", "0");
    			attr_dev(iframe1, "allow", "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture");
    			iframe1.allowFullscreen = true;
    			add_location(iframe1, file$7, 13, 1, 620);
    			add_location(br12, file$7, 14, 1, 825);
    			add_location(br13, file$7, 14, 5, 829);
    			add_location(br14, file$7, 14, 9, 833);
    			add_location(br15, file$7, 14, 13, 837);
    			add_location(br16, file$7, 14, 17, 841);
    			add_location(br17, file$7, 14, 21, 845);
    			add_location(br18, file$7, 14, 25, 849);
    			add_location(br19, file$7, 14, 29, 853);
    			attr_dev(img4, "class", "img portfolio-item svelte-vso4qw");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/musicPosters/3.jpg")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$7, 15, 1, 859);
    			attr_dev(img5, "class", "img portfolio-item svelte-vso4qw");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/musicPosters/3b.jpg")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$7, 16, 1, 936);
    			add_location(br20, file$7, 16, 77, 1012);
    			attr_dev(iframe2, "width", "560");
    			attr_dev(iframe2, "height", "315");
    			if (iframe2.src !== (iframe2_src_value = "https://www.youtube.com/embed/87berJKi2ek")) attr_dev(iframe2, "src", iframe2_src_value);
    			attr_dev(iframe2, "frameborder", "0");
    			attr_dev(iframe2, "allow", "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture");
    			iframe2.allowFullscreen = true;
    			add_location(iframe2, file$7, 17, 1, 1018);
    			add_location(br21, file$7, 18, 1, 1222);
    			add_location(br22, file$7, 18, 5, 1226);
    			add_location(br23, file$7, 18, 9, 1230);
    			add_location(br24, file$7, 18, 13, 1234);
    			add_location(br25, file$7, 18, 17, 1238);
    			add_location(br26, file$7, 18, 21, 1242);
    			add_location(br27, file$7, 18, 25, 1246);
    			add_location(br28, file$7, 18, 29, 1250);
    			attr_dev(div, "class", "backgroundcolor svelte-vso4qw");
    			add_location(div, file$7, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, br2);
    			append_dev(div, t2);
    			append_dev(div, iframe0);
    			append_dev(div, t3);
    			append_dev(div, br3);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, br10);
    			append_dev(div, t4);
    			append_dev(div, img2);
    			append_dev(div, t5);
    			append_dev(div, img3);
    			append_dev(div, br11);
    			append_dev(div, t6);
    			append_dev(div, iframe1);
    			append_dev(div, t7);
    			append_dev(div, br12);
    			append_dev(div, br13);
    			append_dev(div, br14);
    			append_dev(div, br15);
    			append_dev(div, br16);
    			append_dev(div, br17);
    			append_dev(div, br18);
    			append_dev(div, br19);
    			append_dev(div, t8);
    			append_dev(div, img4);
    			append_dev(div, t9);
    			append_dev(div, img5);
    			append_dev(div, br20);
    			append_dev(div, t10);
    			append_dev(div, iframe2);
    			append_dev(div, t11);
    			append_dev(div, br21);
    			append_dev(div, br22);
    			append_dev(div, br23);
    			append_dev(div, br24);
    			append_dev(div, br25);
    			append_dev(div, br26);
    			append_dev(div, br27);
    			append_dev(div, br28);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Musicposters> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Musicposters", $$slots, []);
    	return [];
    }

    class Musicposters extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Musicposters",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/specifics/Timatal.svelte generated by Svelte v3.23.0 */

    const file$8 = "src/specifics/Timatal.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let br2;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let t7;
    	let img7;
    	let img7_src_value;
    	let t8;
    	let img8;
    	let img8_src_value;
    	let t9;
    	let img9;
    	let img9_src_value;
    	let t10;
    	let img10;
    	let img10_src_value;
    	let t11;
    	let img11;
    	let img11_src_value;
    	let t12;
    	let img12;
    	let img12_src_value;
    	let t13;
    	let img13;
    	let img13_src_value;
    	let t14;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;
    	let br10;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			br2 = element("br");
    			t1 = space();
    			img1 = element("img");
    			t2 = space();
    			img2 = element("img");
    			t3 = space();
    			img3 = element("img");
    			t4 = space();
    			img4 = element("img");
    			t5 = space();
    			img5 = element("img");
    			t6 = space();
    			img6 = element("img");
    			t7 = space();
    			img7 = element("img");
    			t8 = space();
    			img8 = element("img");
    			t9 = space();
    			img9 = element("img");
    			t10 = space();
    			img10 = element("img");
    			t11 = space();
    			img11 = element("img");
    			t12 = space();
    			img12 = element("img");
    			t13 = space();
    			img13 = element("img");
    			t14 = space();
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			br10 = element("br");
    			add_location(br0, file$8, 6, 1, 54);
    			add_location(br1, file$8, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-197gr3d");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/timatal/sammen.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$8, 7, 1, 64);
    			add_location(br2, file$8, 7, 76, 139);
    			attr_dev(img1, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/timatal/1.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$8, 8, 1, 145);
    			attr_dev(img2, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/timatal/2.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$8, 9, 1, 225);
    			attr_dev(img3, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/timatal/3.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$8, 10, 1, 305);
    			attr_dev(img4, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/timatal/5.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$8, 11, 1, 385);
    			attr_dev(img5, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/timatal/6.png")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$8, 12, 1, 465);
    			attr_dev(img6, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/timatal/4.png")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$8, 13, 1, 545);
    			attr_dev(img7, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/timatal/7.png")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$8, 16, 1, 629);
    			attr_dev(img8, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/timatal/8.png")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$8, 17, 1, 709);
    			attr_dev(img9, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img9, "alt", "mynd");
    			if (img9.src !== (img9_src_value = "igms/timatal/9.png")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$8, 18, 1, 789);
    			attr_dev(img10, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img10, "alt", "mynd");
    			if (img10.src !== (img10_src_value = "igms/timatal/11.png")) attr_dev(img10, "src", img10_src_value);
    			add_location(img10, file$8, 20, 1, 871);
    			attr_dev(img11, "class", "img portfolio-item smaller svelte-197gr3d");
    			attr_dev(img11, "alt", "mynd");
    			if (img11.src !== (img11_src_value = "igms/timatal/10.png")) attr_dev(img11, "src", img11_src_value);
    			add_location(img11, file$8, 21, 1, 952);
    			attr_dev(img12, "class", "img portfolio-item svelte-197gr3d");
    			attr_dev(img12, "alt", "mynd");
    			if (img12.src !== (img12_src_value = "igms/timatal/sammen2.png")) attr_dev(img12, "src", img12_src_value);
    			add_location(img12, file$8, 22, 1, 1033);
    			attr_dev(img13, "class", "img portfolio-item svelte-197gr3d");
    			attr_dev(img13, "alt", "mynd");
    			if (img13.src !== (img13_src_value = "igms/timatal/uppst.jpg")) attr_dev(img13, "src", img13_src_value);
    			add_location(img13, file$8, 23, 1, 1111);
    			add_location(br3, file$8, 24, 1, 1187);
    			add_location(br4, file$8, 24, 5, 1191);
    			add_location(br5, file$8, 24, 9, 1195);
    			add_location(br6, file$8, 24, 13, 1199);
    			add_location(br7, file$8, 24, 17, 1203);
    			add_location(br8, file$8, 24, 21, 1207);
    			add_location(br9, file$8, 24, 25, 1211);
    			add_location(br10, file$8, 24, 29, 1215);
    			attr_dev(div, "class", "backgroundcolor svelte-197gr3d");
    			add_location(div, file$8, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, br2);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, t6);
    			append_dev(div, img6);
    			append_dev(div, t7);
    			append_dev(div, img7);
    			append_dev(div, t8);
    			append_dev(div, img8);
    			append_dev(div, t9);
    			append_dev(div, img9);
    			append_dev(div, t10);
    			append_dev(div, img10);
    			append_dev(div, t11);
    			append_dev(div, img11);
    			append_dev(div, t12);
    			append_dev(div, img12);
    			append_dev(div, t13);
    			append_dev(div, img13);
    			append_dev(div, t14);
    			append_dev(div, br3);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, br10);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Timatal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Timatal", $$slots, []);
    	return [];
    }

    class Timatal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Timatal",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/specifics/ToolsOfExpression.svelte generated by Svelte v3.23.0 */

    const file$9 = "src/specifics/ToolsOfExpression.svelte";

    function create_fragment$9(ctx) {
    	let div;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let img2;
    	let img2_src_value;
    	let t2;
    	let img3;
    	let img3_src_value;
    	let t3;
    	let img4;
    	let img4_src_value;
    	let t4;
    	let img5;
    	let img5_src_value;
    	let t5;
    	let img6;
    	let img6_src_value;
    	let t6;
    	let img7;
    	let img7_src_value;
    	let t7;
    	let img8;
    	let img8_src_value;
    	let t8;
    	let img9;
    	let img9_src_value;
    	let t9;
    	let img10;
    	let img10_src_value;
    	let br0;
    	let t10;
    	let img11;
    	let img11_src_value;
    	let t11;
    	let br1;
    	let br2;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img0 = element("img");
    			t0 = space();
    			img1 = element("img");
    			t1 = space();
    			img2 = element("img");
    			t2 = space();
    			img3 = element("img");
    			t3 = space();
    			img4 = element("img");
    			t4 = space();
    			img5 = element("img");
    			t5 = space();
    			img6 = element("img");
    			t6 = space();
    			img7 = element("img");
    			t7 = space();
    			img8 = element("img");
    			t8 = space();
    			img9 = element("img");
    			t9 = space();
    			img10 = element("img");
    			br0 = element("br");
    			t10 = space();
    			img11 = element("img");
    			t11 = space();
    			br1 = element("br");
    			br2 = element("br");
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			attr_dev(img0, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/tools/1.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$9, 6, 1, 54);
    			attr_dev(img1, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/tools/2.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$9, 7, 1, 124);
    			attr_dev(img2, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/tools/3.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$9, 8, 1, 194);
    			attr_dev(img3, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/tools/4.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$9, 9, 1, 264);
    			attr_dev(img4, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/tools/5.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$9, 10, 1, 334);
    			attr_dev(img5, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/tools/6.png")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$9, 11, 1, 404);
    			attr_dev(img6, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/tools/7.png")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$9, 12, 1, 474);
    			attr_dev(img7, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/tools/9.png")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$9, 13, 1, 544);
    			attr_dev(img8, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/tools/10.png")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$9, 14, 1, 614);
    			attr_dev(img9, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img9, "alt", "mynd");
    			if (img9.src !== (img9_src_value = "igms/tools/11.png")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$9, 15, 1, 685);
    			attr_dev(img10, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img10, "alt", "mynd");
    			if (img10.src !== (img10_src_value = "igms/tools/12.png")) attr_dev(img10, "src", img10_src_value);
    			add_location(img10, file$9, 16, 1, 756);
    			add_location(br0, file$9, 16, 70, 825);
    			attr_dev(img11, "class", "img portfolio-item svelte-1phlr82");
    			attr_dev(img11, "alt", "mynd");
    			if (img11.src !== (img11_src_value = "igms/tools/tools.png")) attr_dev(img11, "src", img11_src_value);
    			add_location(img11, file$9, 17, 1, 831);
    			add_location(br1, file$9, 18, 1, 905);
    			add_location(br2, file$9, 18, 5, 909);
    			add_location(br3, file$9, 18, 9, 913);
    			add_location(br4, file$9, 18, 13, 917);
    			add_location(br5, file$9, 18, 17, 921);
    			add_location(br6, file$9, 18, 21, 925);
    			add_location(br7, file$9, 18, 25, 929);
    			add_location(br8, file$9, 18, 29, 933);
    			attr_dev(div, "class", "backgroundcolor svelte-1phlr82");
    			add_location(div, file$9, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img0);
    			append_dev(div, t0);
    			append_dev(div, img1);
    			append_dev(div, t1);
    			append_dev(div, img2);
    			append_dev(div, t2);
    			append_dev(div, img3);
    			append_dev(div, t3);
    			append_dev(div, img4);
    			append_dev(div, t4);
    			append_dev(div, img5);
    			append_dev(div, t5);
    			append_dev(div, img6);
    			append_dev(div, t6);
    			append_dev(div, img7);
    			append_dev(div, t7);
    			append_dev(div, img8);
    			append_dev(div, t8);
    			append_dev(div, img9);
    			append_dev(div, t9);
    			append_dev(div, img10);
    			append_dev(div, br0);
    			append_dev(div, t10);
    			append_dev(div, img11);
    			append_dev(div, t11);
    			append_dev(div, br1);
    			append_dev(div, br2);
    			append_dev(div, br3);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ToolsOfExpression> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ToolsOfExpression", $$slots, []);
    	return [];
    }

    class ToolsOfExpression extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ToolsOfExpression",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/specifics/Trash.svelte generated by Svelte v3.23.0 */

    const file$a = "src/specifics/Trash.svelte";

    function create_fragment$a(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let br2;
    	let t2;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let img2;
    	let img2_src_value;
    	let t4;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;
    	let br10;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			br2 = element("br");
    			t2 = space();
    			img1 = element("img");
    			t3 = space();
    			img2 = element("img");
    			t4 = space();
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			br10 = element("br");
    			add_location(br0, file$a, 6, 1, 54);
    			add_location(br1, file$a, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-zqi07z");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/trash/4.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$a, 7, 1, 64);
    			add_location(br2, file$a, 8, 1, 134);
    			attr_dev(img1, "class", "img portfolio-item svelte-zqi07z");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/trash/1.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$a, 9, 1, 140);
    			attr_dev(img2, "class", "img portfolio-item svelte-zqi07z");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/trash/1.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$a, 10, 1, 210);
    			add_location(br3, file$a, 11, 1, 280);
    			add_location(br4, file$a, 11, 5, 284);
    			add_location(br5, file$a, 11, 9, 288);
    			add_location(br6, file$a, 11, 13, 292);
    			add_location(br7, file$a, 11, 17, 296);
    			add_location(br8, file$a, 11, 21, 300);
    			add_location(br9, file$a, 11, 25, 304);
    			add_location(br10, file$a, 11, 29, 308);
    			attr_dev(div, "class", "backgroundcolor svelte-zqi07z");
    			add_location(div, file$a, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, t1);
    			append_dev(div, br2);
    			append_dev(div, t2);
    			append_dev(div, img1);
    			append_dev(div, t3);
    			append_dev(div, img2);
    			append_dev(div, t4);
    			append_dev(div, br3);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, br10);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Trash> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Trash", $$slots, []);
    	return [];
    }

    class Trash extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trash",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/specifics/MusicBook.svelte generated by Svelte v3.23.0 */

    const file$b = "src/specifics/MusicBook.svelte";

    function create_fragment$b(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let t7;
    	let img7;
    	let img7_src_value;
    	let t8;
    	let br2;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;
    	let t9;
    	let iframe;
    	let iframe_src_value;
    	let t10;
    	let p;
    	let t12;
    	let br10;
    	let br11;
    	let br12;
    	let br13;
    	let br14;
    	let br15;
    	let br16;
    	let br17;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			t2 = space();
    			img2 = element("img");
    			t3 = space();
    			img3 = element("img");
    			t4 = space();
    			img4 = element("img");
    			t5 = space();
    			img5 = element("img");
    			t6 = space();
    			img6 = element("img");
    			t7 = space();
    			img7 = element("img");
    			t8 = space();
    			br2 = element("br");
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			t9 = space();
    			iframe = element("iframe");
    			t10 = space();
    			p = element("p");
    			p.textContent = "***Watch/listen with headphones***";
    			t12 = space();
    			br10 = element("br");
    			br11 = element("br");
    			br12 = element("br");
    			br13 = element("br");
    			br14 = element("br");
    			br15 = element("br");
    			br16 = element("br");
    			br17 = element("br");
    			add_location(br0, file$b, 6, 1, 54);
    			add_location(br1, file$b, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/musicBook/front.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$b, 7, 1, 64);
    			attr_dev(img1, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/musicBook/back.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$b, 8, 1, 150);
    			attr_dev(img2, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/musicBook/6.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$b, 9, 1, 235);
    			attr_dev(img3, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/musicBook/5.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$b, 10, 1, 309);
    			attr_dev(img4, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/musicBook/4.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$b, 11, 1, 383);
    			attr_dev(img5, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/musicBook/3.png")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$b, 12, 1, 457);
    			attr_dev(img6, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/musicBook/2.png")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$b, 13, 1, 531);
    			attr_dev(img7, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/musicBook/1.png")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$b, 14, 1, 605);
    			add_location(br2, file$b, 15, 1, 679);
    			add_location(br3, file$b, 15, 5, 683);
    			add_location(br4, file$b, 15, 9, 687);
    			add_location(br5, file$b, 15, 13, 691);
    			add_location(br6, file$b, 15, 17, 695);
    			add_location(br7, file$b, 15, 21, 699);
    			add_location(br8, file$b, 15, 25, 703);
    			add_location(br9, file$b, 15, 29, 707);
    			attr_dev(iframe, "width", "60%");
    			attr_dev(iframe, "height", "70%");
    			if (iframe.src !== (iframe_src_value = "https://www.youtube.com/embed/F-RqTOuxzdA?rel=0&controls=0&showinfo=0")) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "allow", "autoplay; encrypted-media");
    			iframe.allowFullscreen = true;
    			add_location(iframe, file$b, 16, 1, 713);
    			add_location(p, file$b, 17, 1, 907);
    			add_location(br10, file$b, 18, 1, 950);
    			add_location(br11, file$b, 18, 5, 954);
    			add_location(br12, file$b, 18, 9, 958);
    			add_location(br13, file$b, 18, 13, 962);
    			add_location(br14, file$b, 18, 17, 966);
    			add_location(br15, file$b, 18, 21, 970);
    			add_location(br16, file$b, 18, 25, 974);
    			add_location(br17, file$b, 18, 29, 978);
    			attr_dev(div, "class", "backgroundcolor svelte-viypl1");
    			add_location(div, file$b, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, t6);
    			append_dev(div, img6);
    			append_dev(div, t7);
    			append_dev(div, img7);
    			append_dev(div, t8);
    			append_dev(div, br2);
    			append_dev(div, br3);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, t9);
    			append_dev(div, iframe);
    			append_dev(div, t10);
    			append_dev(div, p);
    			append_dev(div, t12);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, br12);
    			append_dev(div, br13);
    			append_dev(div, br14);
    			append_dev(div, br15);
    			append_dev(div, br16);
    			append_dev(div, br17);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MusicBook> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("MusicBook", $$slots, []);
    	return [];
    }

    class MusicBook extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MusicBook",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/specifics/Corrupted.svelte generated by Svelte v3.23.0 */

    const file$c = "src/specifics/Corrupted.svelte";

    function create_fragment$c(ctx) {
    	let div1;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let br2;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br3;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let br4;
    	let t3;
    	let div0;
    	let iframe;
    	let iframe_src_value;
    	let script;
    	let script_src_value;
    	let t4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;
    	let br10;
    	let br11;
    	let br12;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			br2 = element("br");
    			t1 = space();
    			img1 = element("img");
    			br3 = element("br");
    			t2 = space();
    			img2 = element("img");
    			br4 = element("br");
    			t3 = space();
    			div0 = element("div");
    			iframe = element("iframe");
    			script = element("script");
    			t4 = space();
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			br10 = element("br");
    			br11 = element("br");
    			br12 = element("br");
    			add_location(br0, file$c, 6, 1, 54);
    			add_location(br1, file$c, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-lsg2gy");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/corruptedspace/1.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$c, 7, 1, 64);
    			add_location(br2, file$c, 7, 78, 141);
    			attr_dev(img1, "class", "img portfolio-item svelte-lsg2gy");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/corruptedspace/2.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$c, 8, 1, 147);
    			add_location(br3, file$c, 8, 78, 224);
    			attr_dev(img2, "class", "img portfolio-item svelte-lsg2gy");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/corruptedspace/3.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$c, 9, 1, 230);
    			add_location(br4, file$c, 9, 78, 307);
    			if (iframe.src !== (iframe_src_value = "https://player.vimeo.com/video/329483614?autoplay=1&loop=1&color=ffffff&title=0&byline=0&portrait=0")) attr_dev(iframe, "src", iframe_src_value);
    			set_style(iframe, "position", "absolute");
    			set_style(iframe, "top", "0%");
    			set_style(iframe, "left", "20%");
    			set_style(iframe, "width", "60%");
    			set_style(iframe, "height", "100%");
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "allow", "autoplay; fullscreen");
    			iframe.allowFullscreen = true;
    			add_location(iframe, file$c, 11, 51, 364);
    			set_style(div0, "padding", "36% 0 0 0");
    			set_style(div0, "position", "relative");
    			add_location(div0, file$c, 11, 1, 314);
    			if (script.src !== (script_src_value = "https://player.vimeo.com/api/player.js")) attr_dev(script, "src", script_src_value);
    			add_location(script, file$c, 11, 306, 619);
    			add_location(br5, file$c, 12, 1, 683);
    			add_location(br6, file$c, 12, 5, 687);
    			add_location(br7, file$c, 12, 9, 691);
    			add_location(br8, file$c, 12, 13, 695);
    			add_location(br9, file$c, 12, 17, 699);
    			add_location(br10, file$c, 12, 21, 703);
    			add_location(br11, file$c, 12, 25, 707);
    			add_location(br12, file$c, 12, 29, 711);
    			attr_dev(div1, "class", "backgroundcolor svelte-lsg2gy");
    			add_location(div1, file$c, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, br0);
    			append_dev(div1, br1);
    			append_dev(div1, t0);
    			append_dev(div1, img0);
    			append_dev(div1, br2);
    			append_dev(div1, t1);
    			append_dev(div1, img1);
    			append_dev(div1, br3);
    			append_dev(div1, t2);
    			append_dev(div1, img2);
    			append_dev(div1, br4);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, iframe);
    			append_dev(div1, script);
    			append_dev(div1, t4);
    			append_dev(div1, br5);
    			append_dev(div1, br6);
    			append_dev(div1, br7);
    			append_dev(div1, br8);
    			append_dev(div1, br9);
    			append_dev(div1, br10);
    			append_dev(div1, br11);
    			append_dev(div1, br12);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Corrupted> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Corrupted", $$slots, []);
    	return [];
    }

    class Corrupted extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Corrupted",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/specifics/OilBuddies.svelte generated by Svelte v3.23.0 */

    const file$d = "src/specifics/OilBuddies.svelte";

    function create_fragment$d(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let iframe;
    	let iframe_src_value;
    	let script;
    	let script_src_value;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			iframe = element("iframe");
    			script = element("script");
    			if (iframe.src !== (iframe_src_value = "https://player.vimeo.com/video/331605956?autoplay=1&loop=1&title=0&byline=0&portrait=0")) attr_dev(iframe, "src", iframe_src_value);
    			set_style(iframe, "position", "absolute");
    			set_style(iframe, "top", "0");
    			set_style(iframe, "left", "0");
    			set_style(iframe, "width", "100%");
    			set_style(iframe, "height", "100%");
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "allow", "autoplay; fullscreen");
    			iframe.allowFullscreen = true;
    			add_location(iframe, file$d, 7, 58, 201);
    			set_style(div0, "padding", "56.25% 0 0 0");
    			set_style(div0, "position", "relative");
    			add_location(div0, file$d, 7, 5, 148);
    			if (script.src !== (script_src_value = "https://player.vimeo.com/api/player.js")) attr_dev(script, "src", script_src_value);
    			add_location(script, file$d, 7, 298, 441);
    			set_style(div1, "position", "absolute");
    			set_style(div1, "top", "5%");
    			set_style(div1, "left", "5%");
    			set_style(div1, "right", "5%");
    			set_style(div1, "width", "90%");
    			set_style(div1, "height", "90%");
    			add_location(div1, file$d, 6, 1, 54);
    			attr_dev(div2, "class", "backgroundcolor svelte-1bmraz4");
    			add_location(div2, file$d, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, iframe);
    			append_dev(div1, script);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<OilBuddies> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("OilBuddies", $$slots, []);
    	return [];
    }

    class OilBuddies extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OilBuddies",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/specifics/Litabok.svelte generated by Svelte v3.23.0 */

    const file$e = "src/specifics/Litabok.svelte";

    function create_fragment$e(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let br2;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let t7;
    	let img7;
    	let img7_src_value;
    	let t8;
    	let img8;
    	let img8_src_value;
    	let t9;
    	let img9;
    	let img9_src_value;
    	let t10;
    	let img10;
    	let img10_src_value;
    	let t11;
    	let img11;
    	let img11_src_value;
    	let br3;
    	let t12;
    	let img12;
    	let img12_src_value;
    	let t13;
    	let img13;
    	let img13_src_value;
    	let t14;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;
    	let br10;
    	let br11;
    	let t15;
    	let img14;
    	let img14_src_value;
    	let br12;
    	let t16;
    	let img15;
    	let img15_src_value;
    	let t17;
    	let img16;
    	let img16_src_value;
    	let t18;
    	let img17;
    	let img17_src_value;
    	let t19;
    	let br13;
    	let br14;
    	let br15;
    	let br16;
    	let br17;
    	let br18;
    	let br19;
    	let br20;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			br2 = element("br");
    			t1 = space();
    			img1 = element("img");
    			t2 = space();
    			img2 = element("img");
    			t3 = space();
    			img3 = element("img");
    			t4 = space();
    			img4 = element("img");
    			t5 = space();
    			img5 = element("img");
    			t6 = space();
    			img6 = element("img");
    			t7 = space();
    			img7 = element("img");
    			t8 = space();
    			img8 = element("img");
    			t9 = space();
    			img9 = element("img");
    			t10 = space();
    			img10 = element("img");
    			t11 = space();
    			img11 = element("img");
    			br3 = element("br");
    			t12 = space();
    			img12 = element("img");
    			t13 = space();
    			img13 = element("img");
    			t14 = space();
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			br10 = element("br");
    			br11 = element("br");
    			t15 = space();
    			img14 = element("img");
    			br12 = element("br");
    			t16 = space();
    			img15 = element("img");
    			t17 = space();
    			img16 = element("img");
    			t18 = space();
    			img17 = element("img");
    			t19 = space();
    			br13 = element("br");
    			br14 = element("br");
    			br15 = element("br");
    			br16 = element("br");
    			br17 = element("br");
    			br18 = element("br");
    			br19 = element("br");
    			br20 = element("br");
    			add_location(br0, file$e, 6, 1, 54);
    			add_location(br1, file$e, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/litabok/15.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$e, 7, 1, 64);
    			add_location(br2, file$e, 7, 72, 135);
    			attr_dev(img1, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/litabok/14.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$e, 8, 1, 141);
    			attr_dev(img2, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/litabok/13.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$e, 9, 1, 222);
    			attr_dev(img3, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/litabok/12.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$e, 10, 1, 303);
    			attr_dev(img4, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/litabok/10.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$e, 12, 1, 472);
    			attr_dev(img5, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/litabok/9.png")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$e, 13, 1, 553);
    			attr_dev(img6, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/litabok/8.png")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$e, 14, 1, 633);
    			attr_dev(img7, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/litabok/7.png")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$e, 15, 1, 713);
    			attr_dev(img8, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/litabok/6.png")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$e, 16, 1, 793);
    			attr_dev(img9, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img9, "alt", "mynd");
    			if (img9.src !== (img9_src_value = "igms/litabok/5.png")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$e, 17, 1, 873);
    			attr_dev(img10, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img10, "alt", "mynd");
    			if (img10.src !== (img10_src_value = "igms/litabok/4.png")) attr_dev(img10, "src", img10_src_value);
    			add_location(img10, file$e, 18, 1, 954);
    			attr_dev(img11, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img11, "alt", "mynd");
    			if (img11.src !== (img11_src_value = "igms/litabok/3.png")) attr_dev(img11, "src", img11_src_value);
    			add_location(img11, file$e, 19, 1, 1034);
    			add_location(br3, file$e, 19, 79, 1112);
    			attr_dev(img12, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img12, "alt", "mynd");
    			if (img12.src !== (img12_src_value = "igms/litabok/2.png")) attr_dev(img12, "src", img12_src_value);
    			add_location(img12, file$e, 20, 1, 1118);
    			attr_dev(img13, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img13, "alt", "mynd");
    			if (img13.src !== (img13_src_value = "igms/litabok/1.png")) attr_dev(img13, "src", img13_src_value);
    			add_location(img13, file$e, 21, 1, 1198);
    			add_location(br4, file$e, 22, 1, 1278);
    			add_location(br5, file$e, 22, 5, 1282);
    			add_location(br6, file$e, 22, 9, 1286);
    			add_location(br7, file$e, 22, 13, 1290);
    			add_location(br8, file$e, 22, 17, 1294);
    			add_location(br9, file$e, 22, 21, 1298);
    			add_location(br10, file$e, 22, 25, 1302);
    			add_location(br11, file$e, 22, 29, 1306);
    			attr_dev(img14, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img14, "alt", "mynd");
    			if (img14.src !== (img14_src_value = "igms/litabok/3.jpg")) attr_dev(img14, "src", img14_src_value);
    			add_location(img14, file$e, 23, 1, 1312);
    			add_location(br12, file$e, 23, 71, 1382);
    			attr_dev(img15, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img15, "alt", "mynd");
    			if (img15.src !== (img15_src_value = "igms/litabok/2.jpg")) attr_dev(img15, "src", img15_src_value);
    			add_location(img15, file$e, 24, 1, 1388);
    			attr_dev(img16, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img16, "alt", "mynd");
    			if (img16.src !== (img16_src_value = "igms/litabok/1.jpg")) attr_dev(img16, "src", img16_src_value);
    			add_location(img16, file$e, 25, 1, 1460);
    			attr_dev(img17, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img17, "alt", "mynd");
    			if (img17.src !== (img17_src_value = "igms/litabok/0.jpg")) attr_dev(img17, "src", img17_src_value);
    			add_location(img17, file$e, 26, 1, 1532);
    			add_location(br13, file$e, 28, 1, 1606);
    			add_location(br14, file$e, 28, 5, 1610);
    			add_location(br15, file$e, 28, 9, 1614);
    			add_location(br16, file$e, 28, 13, 1618);
    			add_location(br17, file$e, 28, 17, 1622);
    			add_location(br18, file$e, 28, 21, 1626);
    			add_location(br19, file$e, 28, 25, 1630);
    			add_location(br20, file$e, 28, 29, 1634);
    			attr_dev(div, "class", "backgroundcolor svelte-viypl1");
    			add_location(div, file$e, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, br2);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, t6);
    			append_dev(div, img6);
    			append_dev(div, t7);
    			append_dev(div, img7);
    			append_dev(div, t8);
    			append_dev(div, img8);
    			append_dev(div, t9);
    			append_dev(div, img9);
    			append_dev(div, t10);
    			append_dev(div, img10);
    			append_dev(div, t11);
    			append_dev(div, img11);
    			append_dev(div, br3);
    			append_dev(div, t12);
    			append_dev(div, img12);
    			append_dev(div, t13);
    			append_dev(div, img13);
    			append_dev(div, t14);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, t15);
    			append_dev(div, img14);
    			append_dev(div, br12);
    			append_dev(div, t16);
    			append_dev(div, img15);
    			append_dev(div, t17);
    			append_dev(div, img16);
    			append_dev(div, t18);
    			append_dev(div, img17);
    			append_dev(div, t19);
    			append_dev(div, br13);
    			append_dev(div, br14);
    			append_dev(div, br15);
    			append_dev(div, br16);
    			append_dev(div, br17);
    			append_dev(div, br18);
    			append_dev(div, br19);
    			append_dev(div, br20);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Litabok> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Litabok", $$slots, []);
    	return [];
    }

    class Litabok extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Litabok",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/specifics/Plastica.svelte generated by Svelte v3.23.0 */

    const file$f = "src/specifics/Plastica.svelte";

    function create_fragment$f(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let br2;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let t7;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;
    	let br10;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			br2 = element("br");
    			t1 = space();
    			img1 = element("img");
    			t2 = space();
    			img2 = element("img");
    			t3 = space();
    			img3 = element("img");
    			t4 = space();
    			img4 = element("img");
    			t5 = space();
    			img5 = element("img");
    			t6 = space();
    			img6 = element("img");
    			t7 = space();
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			br10 = element("br");
    			add_location(br0, file$f, 6, 1, 54);
    			add_location(br1, file$f, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/plastica/1.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$f, 7, 1, 64);
    			add_location(br2, file$f, 7, 72, 135);
    			attr_dev(img1, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/plastica/2.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$f, 8, 1, 141);
    			attr_dev(img2, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/plastica/3.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$f, 9, 1, 222);
    			attr_dev(img3, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/plastica/5.jpg")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$f, 10, 1, 303);
    			attr_dev(img4, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/plastica/4.jpg")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$f, 11, 1, 384);
    			attr_dev(img5, "class", "img portfolio-item smaller svelte-viypl1");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/plastica/6.jpg")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$f, 12, 1, 465);
    			attr_dev(img6, "class", "img portfolio-item svelte-viypl1");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/plastica/8.jpg")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$f, 14, 1, 626);
    			add_location(br3, file$f, 15, 1, 699);
    			add_location(br4, file$f, 15, 5, 703);
    			add_location(br5, file$f, 15, 9, 707);
    			add_location(br6, file$f, 15, 13, 711);
    			add_location(br7, file$f, 15, 17, 715);
    			add_location(br8, file$f, 15, 21, 719);
    			add_location(br9, file$f, 15, 25, 723);
    			add_location(br10, file$f, 15, 29, 727);
    			attr_dev(div, "class", "backgroundcolor svelte-viypl1");
    			add_location(div, file$f, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, br2);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, t6);
    			append_dev(div, img6);
    			append_dev(div, t7);
    			append_dev(div, br3);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, br10);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Plastica> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Plastica", $$slots, []);
    	return [];
    }

    class Plastica extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Plastica",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src/specifics/FamiliarFaces.svelte generated by Svelte v3.23.0 */

    const file$g = "src/specifics/FamiliarFaces.svelte";

    function create_fragment$g(ctx) {
    	let div1;
    	let br0;
    	let br1;
    	let t0;
    	let div0;
    	let iframe;
    	let iframe_src_value;
    	let script;
    	let script_src_value;
    	let t1;
    	let img0;
    	let img0_src_value;
    	let t2;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let img2;
    	let img2_src_value;
    	let t4;
    	let img3;
    	let img3_src_value;
    	let t5;
    	let img4;
    	let img4_src_value;
    	let t6;
    	let img5;
    	let img5_src_value;
    	let t7;
    	let img6;
    	let img6_src_value;
    	let t8;
    	let br2;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			div0 = element("div");
    			iframe = element("iframe");
    			script = element("script");
    			t1 = space();
    			img0 = element("img");
    			t2 = space();
    			img1 = element("img");
    			t3 = space();
    			img2 = element("img");
    			t4 = space();
    			img3 = element("img");
    			t5 = space();
    			img4 = element("img");
    			t6 = space();
    			img5 = element("img");
    			t7 = space();
    			img6 = element("img");
    			t8 = space();
    			br2 = element("br");
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			add_location(br0, file$g, 6, 1, 54);
    			add_location(br1, file$g, 6, 5, 58);
    			if (iframe.src !== (iframe_src_value = "https://player.vimeo.com/video/324752891?autoplay=1&loop=1&color=ffffff&title=0&byline=0&portrait=0")) attr_dev(iframe, "src", iframe_src_value);
    			set_style(iframe, "position", "absolute");
    			set_style(iframe, "top", "6.5%");
    			set_style(iframe, "left", "20%");
    			set_style(iframe, "width", "60%");
    			set_style(iframe, "height", "80%");
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "allow", "autoplay; fullscreen");
    			iframe.allowFullscreen = true;
    			add_location(iframe, file$g, 7, 54, 117);
    			set_style(div0, "padding", "56.25% 0 0 0");
    			set_style(div0, "position", "relative");
    			add_location(div0, file$g, 7, 1, 64);
    			if (script.src !== (script_src_value = "https://player.vimeo.com/api/player.js")) attr_dev(script, "src", script_src_value);
    			add_location(script, file$g, 7, 310, 373);
    			attr_dev(img0, "class", "img portfolio-item svelte-zqi07z");
    			set_style(img0, "height", "80%");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/familiarfaces/1.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$g, 8, 1, 437);
    			attr_dev(img1, "class", "img portfolio-item svelte-zqi07z");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/familiarfaces/2.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$g, 9, 1, 536);
    			attr_dev(img2, "class", "img portfolio-item svelte-zqi07z");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/familiarfaces/3.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$g, 10, 1, 614);
    			attr_dev(img3, "class", "img portfolio-item svelte-zqi07z");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/familiarfaces/4.jpg")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$g, 11, 1, 692);
    			attr_dev(img4, "class", "img portfolio-item svelte-zqi07z");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/familiarfaces/5.jpg")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$g, 12, 1, 770);
    			attr_dev(img5, "class", "img portfolio-item svelte-zqi07z");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/familiarfaces/6.jpg")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$g, 13, 1, 848);
    			attr_dev(img6, "class", "img portfolio-item svelte-zqi07z");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/familiarfaces/7.jpg")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$g, 14, 1, 926);
    			add_location(br2, file$g, 15, 1, 1004);
    			add_location(br3, file$g, 15, 5, 1008);
    			add_location(br4, file$g, 15, 9, 1012);
    			add_location(br5, file$g, 15, 13, 1016);
    			add_location(br6, file$g, 15, 17, 1020);
    			add_location(br7, file$g, 15, 21, 1024);
    			add_location(br8, file$g, 15, 25, 1028);
    			add_location(br9, file$g, 15, 29, 1032);
    			attr_dev(div1, "class", "backgroundcolor svelte-zqi07z");
    			add_location(div1, file$g, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, br0);
    			append_dev(div1, br1);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, iframe);
    			append_dev(div1, script);
    			append_dev(div1, t1);
    			append_dev(div1, img0);
    			append_dev(div1, t2);
    			append_dev(div1, img1);
    			append_dev(div1, t3);
    			append_dev(div1, img2);
    			append_dev(div1, t4);
    			append_dev(div1, img3);
    			append_dev(div1, t5);
    			append_dev(div1, img4);
    			append_dev(div1, t6);
    			append_dev(div1, img5);
    			append_dev(div1, t7);
    			append_dev(div1, img6);
    			append_dev(div1, t8);
    			append_dev(div1, br2);
    			append_dev(div1, br3);
    			append_dev(div1, br4);
    			append_dev(div1, br5);
    			append_dev(div1, br6);
    			append_dev(div1, br7);
    			append_dev(div1, br8);
    			append_dev(div1, br9);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FamiliarFaces> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FamiliarFaces", $$slots, []);
    	return [];
    }

    class FamiliarFaces extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FamiliarFaces",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src/specifics/Likamar.svelte generated by Svelte v3.23.0 */

    const file$h = "src/specifics/Likamar.svelte";

    function create_fragment$h(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br2;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let br3;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let br4;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let t7;
    	let img7;
    	let img7_src_value;
    	let t8;
    	let img8;
    	let img8_src_value;
    	let t9;
    	let img9;
    	let img9_src_value;
    	let t10;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;
    	let br10;
    	let br11;
    	let br12;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			br2 = element("br");
    			t2 = space();
    			img2 = element("img");
    			t3 = space();
    			img3 = element("img");
    			t4 = space();
    			img4 = element("img");
    			br3 = element("br");
    			t5 = space();
    			img5 = element("img");
    			br4 = element("br");
    			t6 = space();
    			img6 = element("img");
    			t7 = space();
    			img7 = element("img");
    			t8 = space();
    			img8 = element("img");
    			t9 = space();
    			img9 = element("img");
    			t10 = space();
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			br10 = element("br");
    			br11 = element("br");
    			br12 = element("br");
    			add_location(br0, file$h, 6, 1, 54);
    			add_location(br1, file$h, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item tiny svelte-sledhr");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/typedesign/likamartestpink.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$h, 7, 1, 64);
    			attr_dev(img1, "class", "img portfolio-item svelte-sledhr");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/typedesign/apri2.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$h, 10, 1, 160);
    			add_location(br2, file$h, 10, 78, 237);
    			attr_dev(img2, "class", "img portfolio-item smaller svelte-sledhr");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/typedesign/blatt.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$h, 12, 1, 245);
    			attr_dev(img3, "class", "img portfolio-item smaller svelte-sledhr");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/typedesign/dokkt.jpg")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$h, 13, 1, 332);
    			attr_dev(img4, "class", "img portfolio-item smaller svelte-sledhr");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/typedesign/orange.jpg")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$h, 14, 1, 419);
    			add_location(br3, file$h, 14, 87, 505);
    			attr_dev(img5, "class", "img portfolio-item larger svelte-sledhr");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/typedesign/building.jpg")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$h, 15, 1, 511);
    			add_location(br4, file$h, 15, 88, 598);
    			attr_dev(img6, "class", "img portfolio-item smaller-two svelte-sledhr");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/typedesign/motionMobile.gif")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$h, 17, 1, 605);
    			attr_dev(img7, "class", "img portfolio-item smaller-two  svelte-sledhr");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/typedesign/motionMobileCgaedi.gif")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$h, 18, 1, 703);
    			attr_dev(img8, "class", "img portfolio-item smaller-two svelte-sledhr");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/typedesign/svhv27.jpg")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$h, 19, 1, 808);
    			attr_dev(img9, "class", "img portfolio-item smaller-two svelte-sledhr");
    			attr_dev(img9, "alt", "mynd");
    			if (img9.src !== (img9_src_value = "igms/typedesign/svhv35.jpg")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$h, 20, 1, 900);
    			add_location(br5, file$h, 22, 1, 994);
    			add_location(br6, file$h, 22, 5, 998);
    			add_location(br7, file$h, 22, 9, 1002);
    			add_location(br8, file$h, 22, 13, 1006);
    			add_location(br9, file$h, 22, 17, 1010);
    			add_location(br10, file$h, 22, 21, 1014);
    			add_location(br11, file$h, 22, 25, 1018);
    			add_location(br12, file$h, 22, 29, 1022);
    			attr_dev(div, "class", "backgroundcolor svelte-sledhr");
    			add_location(div, file$h, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, br2);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, br3);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, br4);
    			append_dev(div, t6);
    			append_dev(div, img6);
    			append_dev(div, t7);
    			append_dev(div, img7);
    			append_dev(div, t8);
    			append_dev(div, img8);
    			append_dev(div, t9);
    			append_dev(div, img9);
    			append_dev(div, t10);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, br12);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Likamar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Likamar", $$slots, []);
    	return [];
    }

    class Likamar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Likamar",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src/specifics/Oeb.svelte generated by Svelte v3.23.0 */

    const file$i = "src/specifics/Oeb.svelte";

    function create_fragment$i(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let br2;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br10;
    	let br11;
    	let br12;
    	let br13;
    	let br14;
    	let br15;
    	let br16;
    	let br17;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let br18;
    	let br19;
    	let br20;
    	let br21;
    	let br22;
    	let br23;
    	let br24;
    	let br25;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let br26;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let t7;
    	let img7;
    	let img7_src_value;
    	let br27;
    	let br28;
    	let br29;
    	let br30;
    	let br31;
    	let br32;
    	let br33;
    	let br34;
    	let t8;
    	let img8;
    	let img8_src_value;
    	let t9;
    	let br35;
    	let br36;
    	let br37;
    	let br38;
    	let br39;
    	let br40;
    	let br41;
    	let br42;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			br2 = element("br");
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			t1 = space();
    			img1 = element("img");
    			br10 = element("br");
    			br11 = element("br");
    			br12 = element("br");
    			br13 = element("br");
    			br14 = element("br");
    			br15 = element("br");
    			br16 = element("br");
    			br17 = element("br");
    			t2 = space();
    			img2 = element("img");
    			br18 = element("br");
    			br19 = element("br");
    			br20 = element("br");
    			br21 = element("br");
    			br22 = element("br");
    			br23 = element("br");
    			br24 = element("br");
    			br25 = element("br");
    			t3 = space();
    			img3 = element("img");
    			br26 = element("br");
    			t4 = space();
    			img4 = element("img");
    			t5 = space();
    			img5 = element("img");
    			t6 = space();
    			img6 = element("img");
    			t7 = space();
    			img7 = element("img");
    			br27 = element("br");
    			br28 = element("br");
    			br29 = element("br");
    			br30 = element("br");
    			br31 = element("br");
    			br32 = element("br");
    			br33 = element("br");
    			br34 = element("br");
    			t8 = space();
    			img8 = element("img");
    			t9 = space();
    			br35 = element("br");
    			br36 = element("br");
    			br37 = element("br");
    			br38 = element("br");
    			br39 = element("br");
    			br40 = element("br");
    			br41 = element("br");
    			br42 = element("br");
    			add_location(br0, file$i, 6, 1, 54);
    			add_location(br1, file$i, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item larger svelte-c6giv6");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/oeb/screena.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$i, 7, 1, 64);
    			add_location(br2, file$i, 7, 80, 143);
    			add_location(br3, file$i, 7, 84, 147);
    			add_location(br4, file$i, 7, 88, 151);
    			add_location(br5, file$i, 7, 92, 155);
    			add_location(br6, file$i, 7, 96, 159);
    			add_location(br7, file$i, 7, 100, 163);
    			add_location(br8, file$i, 7, 104, 167);
    			add_location(br9, file$i, 7, 108, 171);
    			attr_dev(img1, "class", "img portfolio-item larger svelte-c6giv6");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/oeb/screenb.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$i, 8, 1, 177);
    			add_location(br10, file$i, 8, 80, 256);
    			add_location(br11, file$i, 8, 84, 260);
    			add_location(br12, file$i, 8, 88, 264);
    			add_location(br13, file$i, 8, 92, 268);
    			add_location(br14, file$i, 8, 96, 272);
    			add_location(br15, file$i, 8, 100, 276);
    			add_location(br16, file$i, 8, 104, 280);
    			add_location(br17, file$i, 8, 108, 284);
    			attr_dev(img2, "class", "img portfolio-item larger svelte-c6giv6");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/oeb/screenc.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$i, 9, 1, 290);
    			add_location(br18, file$i, 9, 80, 369);
    			add_location(br19, file$i, 9, 84, 373);
    			add_location(br20, file$i, 9, 88, 377);
    			add_location(br21, file$i, 9, 92, 381);
    			add_location(br22, file$i, 9, 96, 385);
    			add_location(br23, file$i, 9, 100, 389);
    			add_location(br24, file$i, 9, 104, 393);
    			add_location(br25, file$i, 9, 108, 397);
    			attr_dev(img3, "class", "img portfolio-item svelte-c6giv6");
    			set_style(img3, "height", "80%");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/oeb/h.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$i, 12, 1, 525);
    			add_location(br26, file$i, 12, 88, 612);
    			attr_dev(img4, "class", "img portfolio-item svelte-c6giv6");
    			set_style(img4, "height", "80%");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/oeb/0a.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$i, 13, 1, 618);
    			attr_dev(img5, "class", "img portfolio-item svelte-c6giv6");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/oeb/1b.png")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$i, 14, 1, 708);
    			attr_dev(img6, "class", "img portfolio-item svelte-c6giv6");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/oeb/5.png")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$i, 15, 1, 777);
    			attr_dev(img7, "class", "img portfolio-item svelte-c6giv6");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/oeb/yout_Page_25.jpg")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$i, 18, 1, 849);
    			add_location(br27, file$i, 18, 78, 926);
    			add_location(br28, file$i, 18, 82, 930);
    			add_location(br29, file$i, 18, 86, 934);
    			add_location(br30, file$i, 18, 90, 938);
    			add_location(br31, file$i, 18, 94, 942);
    			add_location(br32, file$i, 18, 98, 946);
    			add_location(br33, file$i, 18, 102, 950);
    			add_location(br34, file$i, 18, 106, 954);
    			attr_dev(img8, "class", "img portfolio-item svelte-c6giv6");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/oeb/yout_Page_20.jpg")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$i, 19, 1, 960);
    			add_location(br35, file$i, 28, 1, 1424);
    			add_location(br36, file$i, 28, 5, 1428);
    			add_location(br37, file$i, 28, 9, 1432);
    			add_location(br38, file$i, 28, 13, 1436);
    			add_location(br39, file$i, 28, 17, 1440);
    			add_location(br40, file$i, 28, 21, 1444);
    			add_location(br41, file$i, 28, 25, 1448);
    			add_location(br42, file$i, 28, 29, 1452);
    			attr_dev(div, "class", "backgroundcolor svelte-c6giv6");
    			add_location(div, file$i, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, br2);
    			append_dev(div, br3);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, br12);
    			append_dev(div, br13);
    			append_dev(div, br14);
    			append_dev(div, br15);
    			append_dev(div, br16);
    			append_dev(div, br17);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, br18);
    			append_dev(div, br19);
    			append_dev(div, br20);
    			append_dev(div, br21);
    			append_dev(div, br22);
    			append_dev(div, br23);
    			append_dev(div, br24);
    			append_dev(div, br25);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, br26);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, t6);
    			append_dev(div, img6);
    			append_dev(div, t7);
    			append_dev(div, img7);
    			append_dev(div, br27);
    			append_dev(div, br28);
    			append_dev(div, br29);
    			append_dev(div, br30);
    			append_dev(div, br31);
    			append_dev(div, br32);
    			append_dev(div, br33);
    			append_dev(div, br34);
    			append_dev(div, t8);
    			append_dev(div, img8);
    			append_dev(div, t9);
    			append_dev(div, br35);
    			append_dev(div, br36);
    			append_dev(div, br37);
    			append_dev(div, br38);
    			append_dev(div, br39);
    			append_dev(div, br40);
    			append_dev(div, br41);
    			append_dev(div, br42);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Oeb> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Oeb", $$slots, []);
    	return [];
    }

    class Oeb extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Oeb",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* src/specifics/beauimg.svelte generated by Svelte v3.23.0 */

    const file$j = "src/specifics/beauimg.svelte";

    function create_fragment$j(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let br2;
    	let br3;
    	let br4;
    	let br5;
    	let t2;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let img2;
    	let img2_src_value;
    	let br6;
    	let t4;
    	let img3;
    	let img3_src_value;
    	let br7;
    	let t5;
    	let img4;
    	let img4_src_value;
    	let t6;
    	let img5;
    	let img5_src_value;
    	let t7;
    	let img6;
    	let img6_src_value;
    	let br8;
    	let t8;
    	let img7;
    	let img7_src_value;
    	let t9;
    	let img8;
    	let img8_src_value;
    	let t10;
    	let img9;
    	let img9_src_value;
    	let t11;
    	let img10;
    	let img10_src_value;
    	let t12;
    	let img11;
    	let img11_src_value;
    	let t13;
    	let img12;
    	let img12_src_value;
    	let t14;
    	let img13;
    	let img13_src_value;
    	let br9;
    	let t15;
    	let img14;
    	let img14_src_value;
    	let t16;
    	let img15;
    	let img15_src_value;
    	let t17;
    	let br10;
    	let br11;
    	let br12;
    	let br13;
    	let t18;
    	let img16;
    	let img16_src_value;
    	let t19;
    	let br14;
    	let br15;
    	let br16;
    	let br17;
    	let t20;
    	let img17;
    	let img17_src_value;
    	let br18;
    	let t21;
    	let img18;
    	let img18_src_value;
    	let t22;
    	let img19;
    	let img19_src_value;
    	let t23;
    	let img20;
    	let img20_src_value;
    	let br19;
    	let t24;
    	let img21;
    	let img21_src_value;
    	let br20;
    	let t25;
    	let img22;
    	let img22_src_value;
    	let t26;
    	let img23;
    	let img23_src_value;
    	let t27;
    	let img24;
    	let img24_src_value;
    	let t28;
    	let img25;
    	let img25_src_value;
    	let t29;
    	let br21;
    	let br22;
    	let br23;
    	let br24;
    	let t30;
    	let img26;
    	let img26_src_value;
    	let t31;
    	let img27;
    	let img27_src_value;
    	let t32;
    	let img28;
    	let img28_src_value;
    	let t33;
    	let img29;
    	let img29_src_value;
    	let t34;
    	let br25;
    	let br26;
    	let br27;
    	let br28;
    	let t35;
    	let img30;
    	let img30_src_value;
    	let t36;
    	let br29;
    	let br30;
    	let br31;
    	let br32;
    	let br33;
    	let br34;
    	let br35;
    	let br36;
    	let t37;
    	let img31;
    	let img31_src_value;
    	let t38;
    	let br37;
    	let br38;
    	let br39;
    	let br40;
    	let br41;
    	let br42;
    	let br43;
    	let br44;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			br2 = element("br");
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			t2 = space();
    			img1 = element("img");
    			t3 = space();
    			img2 = element("img");
    			br6 = element("br");
    			t4 = space();
    			img3 = element("img");
    			br7 = element("br");
    			t5 = space();
    			img4 = element("img");
    			t6 = space();
    			img5 = element("img");
    			t7 = space();
    			img6 = element("img");
    			br8 = element("br");
    			t8 = space();
    			img7 = element("img");
    			t9 = space();
    			img8 = element("img");
    			t10 = space();
    			img9 = element("img");
    			t11 = space();
    			img10 = element("img");
    			t12 = space();
    			img11 = element("img");
    			t13 = space();
    			img12 = element("img");
    			t14 = space();
    			img13 = element("img");
    			br9 = element("br");
    			t15 = space();
    			img14 = element("img");
    			t16 = space();
    			img15 = element("img");
    			t17 = space();
    			br10 = element("br");
    			br11 = element("br");
    			br12 = element("br");
    			br13 = element("br");
    			t18 = space();
    			img16 = element("img");
    			t19 = space();
    			br14 = element("br");
    			br15 = element("br");
    			br16 = element("br");
    			br17 = element("br");
    			t20 = space();
    			img17 = element("img");
    			br18 = element("br");
    			t21 = space();
    			img18 = element("img");
    			t22 = space();
    			img19 = element("img");
    			t23 = space();
    			img20 = element("img");
    			br19 = element("br");
    			t24 = space();
    			img21 = element("img");
    			br20 = element("br");
    			t25 = space();
    			img22 = element("img");
    			t26 = space();
    			img23 = element("img");
    			t27 = space();
    			img24 = element("img");
    			t28 = space();
    			img25 = element("img");
    			t29 = space();
    			br21 = element("br");
    			br22 = element("br");
    			br23 = element("br");
    			br24 = element("br");
    			t30 = space();
    			img26 = element("img");
    			t31 = space();
    			img27 = element("img");
    			t32 = space();
    			img28 = element("img");
    			t33 = space();
    			img29 = element("img");
    			t34 = space();
    			br25 = element("br");
    			br26 = element("br");
    			br27 = element("br");
    			br28 = element("br");
    			t35 = space();
    			img30 = element("img");
    			t36 = space();
    			br29 = element("br");
    			br30 = element("br");
    			br31 = element("br");
    			br32 = element("br");
    			br33 = element("br");
    			br34 = element("br");
    			br35 = element("br");
    			br36 = element("br");
    			t37 = space();
    			img31 = element("img");
    			t38 = space();
    			br37 = element("br");
    			br38 = element("br");
    			br39 = element("br");
    			br40 = element("br");
    			br41 = element("br");
    			br42 = element("br");
    			br43 = element("br");
    			br44 = element("br");
    			add_location(br0, file$j, 6, 1, 54);
    			add_location(br1, file$j, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/beauimg/main.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$j, 7, 1, 64);
    			add_location(br2, file$j, 8, 1, 139);
    			add_location(br3, file$j, 8, 5, 143);
    			add_location(br4, file$j, 8, 9, 147);
    			add_location(br5, file$j, 8, 13, 151);
    			attr_dev(img1, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/beauimg/0.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$j, 9, 1, 157);
    			attr_dev(img2, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/beauimg/1.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$j, 10, 1, 229);
    			add_location(br6, file$j, 10, 71, 299);
    			attr_dev(img3, "class", "img portfolio-item larger svelte-cgatct");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/beauimg/auka1b.jpg")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$j, 11, 1, 305);
    			add_location(br7, file$j, 11, 83, 387);
    			attr_dev(img4, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/beauimg/2.jpg")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$j, 12, 1, 393);
    			attr_dev(img5, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/beauimg/3.jpg")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$j, 13, 1, 465);
    			attr_dev(img6, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/beauimg/4.jpg")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$j, 14, 1, 537);
    			add_location(br8, file$j, 14, 71, 607);
    			attr_dev(img7, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/beauimg/5.jpg")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$j, 15, 1, 613);
    			attr_dev(img8, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/beauimg/6.jpg")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$j, 16, 1, 685);
    			attr_dev(img9, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img9, "alt", "mynd");
    			if (img9.src !== (img9_src_value = "igms/beauimg/7.jpg")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$j, 17, 1, 757);
    			attr_dev(img10, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img10, "alt", "mynd");
    			if (img10.src !== (img10_src_value = "igms/beauimg/8.jpg")) attr_dev(img10, "src", img10_src_value);
    			add_location(img10, file$j, 18, 1, 829);
    			attr_dev(img11, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img11, "alt", "mynd");
    			if (img11.src !== (img11_src_value = "igms/beauimg/9.jpg")) attr_dev(img11, "src", img11_src_value);
    			add_location(img11, file$j, 19, 1, 901);
    			attr_dev(img12, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img12, "alt", "mynd");
    			if (img12.src !== (img12_src_value = "igms/beauimg/10.jpg")) attr_dev(img12, "src", img12_src_value);
    			add_location(img12, file$j, 20, 1, 973);
    			attr_dev(img13, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img13, "alt", "mynd");
    			if (img13.src !== (img13_src_value = "igms/beauimg/11.jpg")) attr_dev(img13, "src", img13_src_value);
    			add_location(img13, file$j, 21, 1, 1046);
    			add_location(br9, file$j, 21, 72, 1117);
    			attr_dev(img14, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img14, "alt", "mynd");
    			if (img14.src !== (img14_src_value = "igms/beauimg/12.jpg")) attr_dev(img14, "src", img14_src_value);
    			add_location(img14, file$j, 22, 1, 1123);
    			attr_dev(img15, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img15, "alt", "mynd");
    			if (img15.src !== (img15_src_value = "igms/beauimg/13.jpg")) attr_dev(img15, "src", img15_src_value);
    			add_location(img15, file$j, 23, 1, 1196);
    			add_location(br10, file$j, 24, 1, 1269);
    			add_location(br11, file$j, 24, 5, 1273);
    			add_location(br12, file$j, 24, 9, 1277);
    			add_location(br13, file$j, 24, 13, 1281);
    			attr_dev(img16, "class", "img portfolio-item larger svelte-cgatct");
    			attr_dev(img16, "alt", "mynd");
    			if (img16.src !== (img16_src_value = "igms/beauimg/blubbsmallerbutnotsmallenough.png")) attr_dev(img16, "src", img16_src_value);
    			add_location(img16, file$j, 25, 1, 1287);
    			add_location(br14, file$j, 26, 1, 1394);
    			add_location(br15, file$j, 26, 5, 1398);
    			add_location(br16, file$j, 26, 9, 1402);
    			add_location(br17, file$j, 26, 13, 1406);
    			attr_dev(img17, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img17, "alt", "mynd");
    			if (img17.src !== (img17_src_value = "igms/beauimg/14.jpg")) attr_dev(img17, "src", img17_src_value);
    			add_location(img17, file$j, 27, 1, 1412);
    			add_location(br18, file$j, 27, 72, 1483);
    			attr_dev(img18, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img18, "alt", "mynd");
    			if (img18.src !== (img18_src_value = "igms/beauimg/15.jpg")) attr_dev(img18, "src", img18_src_value);
    			add_location(img18, file$j, 28, 1, 1489);
    			attr_dev(img19, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img19, "alt", "mynd");
    			if (img19.src !== (img19_src_value = "igms/beauimg/16.jpg")) attr_dev(img19, "src", img19_src_value);
    			add_location(img19, file$j, 29, 1, 1562);
    			attr_dev(img20, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img20, "alt", "mynd");
    			if (img20.src !== (img20_src_value = "igms/beauimg/17.jpg")) attr_dev(img20, "src", img20_src_value);
    			add_location(img20, file$j, 30, 1, 1635);
    			add_location(br19, file$j, 30, 72, 1706);
    			attr_dev(img21, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img21, "alt", "mynd");
    			if (img21.src !== (img21_src_value = "igms/beauimg/21.jpg")) attr_dev(img21, "src", img21_src_value);
    			add_location(img21, file$j, 32, 1, 1713);
    			add_location(br20, file$j, 32, 72, 1784);
    			attr_dev(img22, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img22, "alt", "mynd");
    			if (img22.src !== (img22_src_value = "igms/beauimg/22.jpg")) attr_dev(img22, "src", img22_src_value);
    			add_location(img22, file$j, 33, 1, 1790);
    			attr_dev(img23, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img23, "alt", "mynd");
    			if (img23.src !== (img23_src_value = "igms/beauimg/23.jpg")) attr_dev(img23, "src", img23_src_value);
    			add_location(img23, file$j, 34, 1, 1863);
    			attr_dev(img24, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img24, "alt", "mynd");
    			if (img24.src !== (img24_src_value = "igms/beauimg/24.jpg")) attr_dev(img24, "src", img24_src_value);
    			add_location(img24, file$j, 35, 1, 1936);
    			attr_dev(img25, "class", "img portfolio-item svelte-cgatct");
    			attr_dev(img25, "alt", "mynd");
    			if (img25.src !== (img25_src_value = "igms/beauimg/aukaauka2.jpg")) attr_dev(img25, "src", img25_src_value);
    			add_location(img25, file$j, 36, 1, 2009);
    			add_location(br21, file$j, 38, 1, 2170);
    			add_location(br22, file$j, 38, 5, 2174);
    			add_location(br23, file$j, 38, 9, 2178);
    			add_location(br24, file$j, 38, 13, 2182);
    			attr_dev(img26, "class", "img portfolio-item smaller svelte-cgatct");
    			attr_dev(img26, "alt", "mynd");
    			if (img26.src !== (img26_src_value = "igms/beauimg/aukaa2.jpg")) attr_dev(img26, "src", img26_src_value);
    			add_location(img26, file$j, 39, 1, 2188);
    			attr_dev(img27, "class", "img portfolio-item smaller svelte-cgatct");
    			attr_dev(img27, "alt", "mynd");
    			if (img27.src !== (img27_src_value = "igms/beauimg/aukab2.jpg")) attr_dev(img27, "src", img27_src_value);
    			add_location(img27, file$j, 40, 1, 2273);
    			attr_dev(img28, "class", "img portfolio-item smaller svelte-cgatct");
    			attr_dev(img28, "alt", "mynd");
    			if (img28.src !== (img28_src_value = "igms/beauimg/aukac2.jpg")) attr_dev(img28, "src", img28_src_value);
    			add_location(img28, file$j, 41, 1, 2358);
    			attr_dev(img29, "class", "img portfolio-item smaller svelte-cgatct");
    			attr_dev(img29, "alt", "mynd");
    			if (img29.src !== (img29_src_value = "igms/beauimg/aukad2.jpg")) attr_dev(img29, "src", img29_src_value);
    			add_location(img29, file$j, 42, 1, 2443);
    			add_location(br25, file$j, 43, 1, 2528);
    			add_location(br26, file$j, 43, 5, 2532);
    			add_location(br27, file$j, 43, 9, 2536);
    			add_location(br28, file$j, 43, 13, 2540);
    			attr_dev(img30, "class", "img portfolio-item larger svelte-cgatct");
    			attr_dev(img30, "alt", "mynd");
    			if (img30.src !== (img30_src_value = "igms/beauimg/aukaaukaauka.jpg")) attr_dev(img30, "src", img30_src_value);
    			add_location(img30, file$j, 44, 1, 2546);
    			add_location(br29, file$j, 45, 1, 2636);
    			add_location(br30, file$j, 45, 5, 2640);
    			add_location(br31, file$j, 45, 9, 2644);
    			add_location(br32, file$j, 45, 13, 2648);
    			add_location(br33, file$j, 45, 17, 2652);
    			add_location(br34, file$j, 45, 21, 2656);
    			add_location(br35, file$j, 45, 25, 2660);
    			add_location(br36, file$j, 45, 29, 2664);
    			attr_dev(img31, "class", "img portfolio-item smaller svelte-cgatct");
    			attr_dev(img31, "alt", "mynd");
    			if (img31.src !== (img31_src_value = "igms/beauimg/27.jpg")) attr_dev(img31, "src", img31_src_value);
    			add_location(img31, file$j, 46, 1, 2670);
    			add_location(br37, file$j, 47, 1, 2751);
    			add_location(br38, file$j, 47, 5, 2755);
    			add_location(br39, file$j, 47, 9, 2759);
    			add_location(br40, file$j, 47, 13, 2763);
    			add_location(br41, file$j, 47, 17, 2767);
    			add_location(br42, file$j, 47, 21, 2771);
    			add_location(br43, file$j, 47, 25, 2775);
    			add_location(br44, file$j, 47, 29, 2779);
    			attr_dev(div, "class", "backgroundcolor svelte-cgatct");
    			add_location(div, file$j, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, t1);
    			append_dev(div, br2);
    			append_dev(div, br3);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, t2);
    			append_dev(div, img1);
    			append_dev(div, t3);
    			append_dev(div, img2);
    			append_dev(div, br6);
    			append_dev(div, t4);
    			append_dev(div, img3);
    			append_dev(div, br7);
    			append_dev(div, t5);
    			append_dev(div, img4);
    			append_dev(div, t6);
    			append_dev(div, img5);
    			append_dev(div, t7);
    			append_dev(div, img6);
    			append_dev(div, br8);
    			append_dev(div, t8);
    			append_dev(div, img7);
    			append_dev(div, t9);
    			append_dev(div, img8);
    			append_dev(div, t10);
    			append_dev(div, img9);
    			append_dev(div, t11);
    			append_dev(div, img10);
    			append_dev(div, t12);
    			append_dev(div, img11);
    			append_dev(div, t13);
    			append_dev(div, img12);
    			append_dev(div, t14);
    			append_dev(div, img13);
    			append_dev(div, br9);
    			append_dev(div, t15);
    			append_dev(div, img14);
    			append_dev(div, t16);
    			append_dev(div, img15);
    			append_dev(div, t17);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, br12);
    			append_dev(div, br13);
    			append_dev(div, t18);
    			append_dev(div, img16);
    			append_dev(div, t19);
    			append_dev(div, br14);
    			append_dev(div, br15);
    			append_dev(div, br16);
    			append_dev(div, br17);
    			append_dev(div, t20);
    			append_dev(div, img17);
    			append_dev(div, br18);
    			append_dev(div, t21);
    			append_dev(div, img18);
    			append_dev(div, t22);
    			append_dev(div, img19);
    			append_dev(div, t23);
    			append_dev(div, img20);
    			append_dev(div, br19);
    			append_dev(div, t24);
    			append_dev(div, img21);
    			append_dev(div, br20);
    			append_dev(div, t25);
    			append_dev(div, img22);
    			append_dev(div, t26);
    			append_dev(div, img23);
    			append_dev(div, t27);
    			append_dev(div, img24);
    			append_dev(div, t28);
    			append_dev(div, img25);
    			append_dev(div, t29);
    			append_dev(div, br21);
    			append_dev(div, br22);
    			append_dev(div, br23);
    			append_dev(div, br24);
    			append_dev(div, t30);
    			append_dev(div, img26);
    			append_dev(div, t31);
    			append_dev(div, img27);
    			append_dev(div, t32);
    			append_dev(div, img28);
    			append_dev(div, t33);
    			append_dev(div, img29);
    			append_dev(div, t34);
    			append_dev(div, br25);
    			append_dev(div, br26);
    			append_dev(div, br27);
    			append_dev(div, br28);
    			append_dev(div, t35);
    			append_dev(div, img30);
    			append_dev(div, t36);
    			append_dev(div, br29);
    			append_dev(div, br30);
    			append_dev(div, br31);
    			append_dev(div, br32);
    			append_dev(div, br33);
    			append_dev(div, br34);
    			append_dev(div, br35);
    			append_dev(div, br36);
    			append_dev(div, t37);
    			append_dev(div, img31);
    			append_dev(div, t38);
    			append_dev(div, br37);
    			append_dev(div, br38);
    			append_dev(div, br39);
    			append_dev(div, br40);
    			append_dev(div, br41);
    			append_dev(div, br42);
    			append_dev(div, br43);
    			append_dev(div, br44);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Beauimg> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Beauimg", $$slots, []);
    	return [];
    }

    class Beauimg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Beauimg",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src/specifics/Bread.svelte generated by Svelte v3.23.0 */

    const file$k = "src/specifics/Bread.svelte";

    function create_fragment$k(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let br2;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br3;
    	let t2;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let t3;
    	let img2;
    	let img2_src_value;
    	let t4;
    	let img3;
    	let img3_src_value;
    	let br8;
    	let t5;
    	let br9;
    	let br10;
    	let br11;
    	let br12;
    	let t6;
    	let img4;
    	let img4_src_value;
    	let t7;
    	let br13;
    	let t8;
    	let img5;
    	let img5_src_value;
    	let br14;
    	let t9;
    	let img6;
    	let img6_src_value;
    	let br15;
    	let t10;
    	let img7;
    	let img7_src_value;
    	let br16;
    	let t11;
    	let img8;
    	let img8_src_value;
    	let t12;
    	let img9;
    	let img9_src_value;
    	let t13;
    	let br17;
    	let br18;
    	let br19;
    	let br20;
    	let t14;
    	let img10;
    	let img10_src_value;
    	let t15;
    	let br21;
    	let br22;
    	let br23;
    	let br24;
    	let br25;
    	let br26;
    	let br27;
    	let br28;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			br2 = element("br");
    			t1 = space();
    			img1 = element("img");
    			br3 = element("br");
    			t2 = space();
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			t3 = space();
    			img2 = element("img");
    			t4 = space();
    			img3 = element("img");
    			br8 = element("br");
    			t5 = space();
    			br9 = element("br");
    			br10 = element("br");
    			br11 = element("br");
    			br12 = element("br");
    			t6 = space();
    			img4 = element("img");
    			t7 = space();
    			br13 = element("br");
    			t8 = space();
    			img5 = element("img");
    			br14 = element("br");
    			t9 = space();
    			img6 = element("img");
    			br15 = element("br");
    			t10 = space();
    			img7 = element("img");
    			br16 = element("br");
    			t11 = space();
    			img8 = element("img");
    			t12 = space();
    			img9 = element("img");
    			t13 = space();
    			br17 = element("br");
    			br18 = element("br");
    			br19 = element("br");
    			br20 = element("br");
    			t14 = space();
    			img10 = element("img");
    			t15 = space();
    			br21 = element("br");
    			br22 = element("br");
    			br23 = element("br");
    			br24 = element("br");
    			br25 = element("br");
    			br26 = element("br");
    			br27 = element("br");
    			br28 = element("br");
    			add_location(br0, file$k, 6, 1, 54);
    			add_location(br1, file$k, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-1w6v5kh");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/bread/first.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$k, 7, 1, 64);
    			add_location(br2, file$k, 7, 73, 136);
    			attr_dev(img1, "class", "img portfolio-item svelte-1w6v5kh");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/bread/bread-book-table1b.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$k, 8, 1, 142);
    			add_location(br3, file$k, 8, 86, 227);
    			add_location(br4, file$k, 9, 1, 233);
    			add_location(br5, file$k, 9, 5, 237);
    			add_location(br6, file$k, 9, 9, 241);
    			add_location(br7, file$k, 9, 13, 245);
    			attr_dev(img2, "class", "img portfolio-item svelte-1w6v5kh");
    			set_style(img2, "padding-right", "0px");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/bread/bread-book-p2.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$k, 10, 1, 251);
    			attr_dev(img3, "class", "img portfolio-item svelte-1w6v5kh");
    			set_style(img3, "padding-left", "0px");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/bread/bread-book-p1.jpg")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$k, 11, 1, 361);
    			add_location(br8, file$k, 11, 108, 468);
    			add_location(br9, file$k, 12, 1, 474);
    			add_location(br10, file$k, 12, 5, 478);
    			add_location(br11, file$k, 12, 9, 482);
    			add_location(br12, file$k, 12, 13, 486);
    			attr_dev(img4, "class", "img portfolio-item svelte-1w6v5kh");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/bread/bitmap3.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$k, 13, 1, 492);
    			add_location(br13, file$k, 14, 1, 568);
    			attr_dev(img5, "class", "img portfolio-item svelte-1w6v5kh");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/bread/looking2.jpg")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$k, 20, 1, 691);
    			add_location(br14, file$k, 20, 76, 766);
    			attr_dev(img6, "class", "img portfolio-item svelte-1w6v5kh");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/bread/looking1.jpg")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$k, 21, 1, 772);
    			add_location(br15, file$k, 21, 76, 847);
    			attr_dev(img7, "class", "img portfolio-item svelte-1w6v5kh");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/bread/close2.jpg")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$k, 22, 1, 853);
    			add_location(br16, file$k, 22, 74, 926);
    			attr_dev(img8, "class", "img portfolio-item svelte-1w6v5kh");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/bread/bottle.jpg")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$k, 23, 1, 932);
    			attr_dev(img9, "class", "img portfolio-item svelte-1w6v5kh");
    			attr_dev(img9, "alt", "mynd");
    			if (img9.src !== (img9_src_value = "igms/bread/overview.jpg")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$k, 24, 1, 1007);
    			add_location(br17, file$k, 36, 1, 1698);
    			add_location(br18, file$k, 36, 5, 1702);
    			add_location(br19, file$k, 36, 9, 1706);
    			add_location(br20, file$k, 36, 13, 1710);
    			attr_dev(img10, "class", "img portfolio-item svelte-1w6v5kh");
    			attr_dev(img10, "alt", "mynd");
    			if (img10.src !== (img10_src_value = "igms/bread/bread-book-table2.jpg")) attr_dev(img10, "src", img10_src_value);
    			add_location(img10, file$k, 37, 1, 1716);
    			add_location(br21, file$k, 38, 1, 1802);
    			add_location(br22, file$k, 38, 5, 1806);
    			add_location(br23, file$k, 38, 9, 1810);
    			add_location(br24, file$k, 38, 13, 1814);
    			add_location(br25, file$k, 38, 17, 1818);
    			add_location(br26, file$k, 38, 21, 1822);
    			add_location(br27, file$k, 38, 25, 1826);
    			add_location(br28, file$k, 38, 29, 1830);
    			attr_dev(div, "class", "backgroundcolor svelte-1w6v5kh");
    			add_location(div, file$k, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, br2);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, br3);
    			append_dev(div, t2);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, t3);
    			append_dev(div, img2);
    			append_dev(div, t4);
    			append_dev(div, img3);
    			append_dev(div, br8);
    			append_dev(div, t5);
    			append_dev(div, br9);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, br12);
    			append_dev(div, t6);
    			append_dev(div, img4);
    			append_dev(div, t7);
    			append_dev(div, br13);
    			append_dev(div, t8);
    			append_dev(div, img5);
    			append_dev(div, br14);
    			append_dev(div, t9);
    			append_dev(div, img6);
    			append_dev(div, br15);
    			append_dev(div, t10);
    			append_dev(div, img7);
    			append_dev(div, br16);
    			append_dev(div, t11);
    			append_dev(div, img8);
    			append_dev(div, t12);
    			append_dev(div, img9);
    			append_dev(div, t13);
    			append_dev(div, br17);
    			append_dev(div, br18);
    			append_dev(div, br19);
    			append_dev(div, br20);
    			append_dev(div, t14);
    			append_dev(div, img10);
    			append_dev(div, t15);
    			append_dev(div, br21);
    			append_dev(div, br22);
    			append_dev(div, br23);
    			append_dev(div, br24);
    			append_dev(div, br25);
    			append_dev(div, br26);
    			append_dev(div, br27);
    			append_dev(div, br28);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Bread> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Bread", $$slots, []);
    	return [];
    }

    class Bread extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bread",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* src/specifics/Flora.svelte generated by Svelte v3.23.0 */

    const file$l = "src/specifics/Flora.svelte";

    function create_fragment$l(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br2;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let br3;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let t7;
    	let img7;
    	let img7_src_value;
    	let br4;
    	let t8;
    	let img8;
    	let img8_src_value;
    	let t9;
    	let img9;
    	let img9_src_value;
    	let t10;
    	let img10;
    	let img10_src_value;
    	let br5;
    	let t11;
    	let img11;
    	let img11_src_value;
    	let t12;
    	let img12;
    	let img12_src_value;
    	let br6;
    	let t13;
    	let img13;
    	let img13_src_value;
    	let t14;
    	let img14;
    	let img14_src_value;
    	let br7;
    	let t15;
    	let br8;
    	let br9;
    	let br10;
    	let br11;
    	let br12;
    	let br13;
    	let br14;
    	let br15;
    	let t16;
    	let img15;
    	let img15_src_value;
    	let t17;
    	let img16;
    	let img16_src_value;
    	let t18;
    	let br16;
    	let br17;
    	let br18;
    	let br19;
    	let br20;
    	let br21;
    	let br22;
    	let br23;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			br2 = element("br");
    			t2 = space();
    			img2 = element("img");
    			t3 = space();
    			img3 = element("img");
    			t4 = space();
    			img4 = element("img");
    			t5 = space();
    			img5 = element("img");
    			br3 = element("br");
    			t6 = space();
    			img6 = element("img");
    			t7 = space();
    			img7 = element("img");
    			br4 = element("br");
    			t8 = space();
    			img8 = element("img");
    			t9 = space();
    			img9 = element("img");
    			t10 = space();
    			img10 = element("img");
    			br5 = element("br");
    			t11 = space();
    			img11 = element("img");
    			t12 = space();
    			img12 = element("img");
    			br6 = element("br");
    			t13 = space();
    			img13 = element("img");
    			t14 = space();
    			img14 = element("img");
    			br7 = element("br");
    			t15 = space();
    			br8 = element("br");
    			br9 = element("br");
    			br10 = element("br");
    			br11 = element("br");
    			br12 = element("br");
    			br13 = element("br");
    			br14 = element("br");
    			br15 = element("br");
    			t16 = space();
    			img15 = element("img");
    			t17 = space();
    			img16 = element("img");
    			t18 = space();
    			br16 = element("br");
    			br17 = element("br");
    			br18 = element("br");
    			br19 = element("br");
    			br20 = element("br");
    			br21 = element("br");
    			br22 = element("br");
    			br23 = element("br");
    			add_location(br0, file$l, 6, 1, 54);
    			add_location(br1, file$l, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-7lla10");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/flora/front-desktop.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$l, 7, 1, 64);
    			attr_dev(img1, "class", "img portfolio-item smaller svelte-7lla10");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/flora/front-mobile.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$l, 8, 1, 146);
    			add_location(br2, file$l, 8, 88, 233);
    			attr_dev(img2, "class", "img portfolio-item smaller svelte-7lla10");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/flora/grein1-mobile.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$l, 9, 1, 239);
    			attr_dev(img3, "class", "img portfolio-item svelte-7lla10");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/flora/grein1-desktop.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$l, 10, 1, 329);
    			attr_dev(img4, "class", "img portfolio-item svelte-7lla10");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/flora/grein1c-desktop.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$l, 11, 1, 412);
    			attr_dev(img5, "class", "img portfolio-item svelte-7lla10");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/flora/grein1d-desktop.png")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$l, 12, 1, 496);
    			add_location(br3, file$l, 12, 83, 578);
    			attr_dev(img6, "class", "img portfolio-item smaller svelte-7lla10");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/flora/grein2-mobile.png")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$l, 13, 1, 584);
    			attr_dev(img7, "class", "img portfolio-item smaller svelte-7lla10");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/flora/grein2b-mobile.png")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$l, 14, 1, 674);
    			add_location(br4, file$l, 14, 90, 763);
    			attr_dev(img8, "class", "img portfolio-item smaller svelte-7lla10");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/flora/utgafa7-mobile.png")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$l, 15, 1, 769);
    			attr_dev(img9, "class", "img portfolio-item smaller svelte-7lla10");
    			attr_dev(img9, "alt", "mynd");
    			if (img9.src !== (img9_src_value = "igms/flora/utgafa5-mobile.png")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$l, 16, 1, 860);
    			attr_dev(img10, "class", "img portfolio-item svelte-7lla10");
    			attr_dev(img10, "alt", "mynd");
    			if (img10.src !== (img10_src_value = "igms/flora/utgafa-desktop.png")) attr_dev(img10, "src", img10_src_value);
    			add_location(img10, file$l, 17, 1, 951);
    			add_location(br5, file$l, 17, 82, 1032);
    			attr_dev(img11, "class", "img portfolio-item smaller svelte-7lla10");
    			attr_dev(img11, "alt", "mynd");
    			if (img11.src !== (img11_src_value = "igms/flora/flaedi-mobile.png")) attr_dev(img11, "src", img11_src_value);
    			add_location(img11, file$l, 18, 1, 1038);
    			attr_dev(img12, "class", "img portfolio-item svelte-7lla10");
    			attr_dev(img12, "alt", "mynd");
    			if (img12.src !== (img12_src_value = "igms/flora/flaedi-desktop.png")) attr_dev(img12, "src", img12_src_value);
    			add_location(img12, file$l, 19, 1, 1128);
    			add_location(br6, file$l, 19, 82, 1209);
    			attr_dev(img13, "class", "img portfolio-item svelte-7lla10");
    			attr_dev(img13, "alt", "mynd");
    			if (img13.src !== (img13_src_value = "igms/flora/leita-desktop.png")) attr_dev(img13, "src", img13_src_value);
    			add_location(img13, file$l, 20, 1, 1215);
    			attr_dev(img14, "class", "img portfolio-item smaller svelte-7lla10");
    			attr_dev(img14, "alt", "mynd");
    			if (img14.src !== (img14_src_value = "igms/flora/leita-mobile.png")) attr_dev(img14, "src", img14_src_value);
    			add_location(img14, file$l, 21, 1, 1297);
    			add_location(br7, file$l, 21, 88, 1384);
    			add_location(br8, file$l, 22, 1, 1390);
    			add_location(br9, file$l, 22, 5, 1394);
    			add_location(br10, file$l, 22, 9, 1398);
    			add_location(br11, file$l, 22, 13, 1402);
    			add_location(br12, file$l, 22, 17, 1406);
    			add_location(br13, file$l, 22, 21, 1410);
    			add_location(br14, file$l, 22, 25, 1414);
    			add_location(br15, file$l, 22, 29, 1418);
    			attr_dev(img15, "class", "img portfolio-item larger svelte-7lla10");
    			attr_dev(img15, "alt", "mynd");
    			if (img15.src !== (img15_src_value = "igms/flora/plaggadd.jpg")) attr_dev(img15, "src", img15_src_value);
    			add_location(img15, file$l, 23, 1, 1424);
    			attr_dev(img16, "class", "img portfolio-item smaller svelte-7lla10");
    			attr_dev(img16, "alt", "mynd");
    			if (img16.src !== (img16_src_value = "igms/flora/banner.gif")) attr_dev(img16, "src", img16_src_value);
    			add_location(img16, file$l, 24, 1, 1508);
    			add_location(br16, file$l, 25, 1, 1591);
    			add_location(br17, file$l, 25, 5, 1595);
    			add_location(br18, file$l, 25, 9, 1599);
    			add_location(br19, file$l, 25, 13, 1603);
    			add_location(br20, file$l, 25, 17, 1607);
    			add_location(br21, file$l, 25, 21, 1611);
    			add_location(br22, file$l, 25, 25, 1615);
    			add_location(br23, file$l, 25, 29, 1619);
    			attr_dev(div, "class", "backgroundcolor svelte-7lla10");
    			add_location(div, file$l, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, br2);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, br3);
    			append_dev(div, t6);
    			append_dev(div, img6);
    			append_dev(div, t7);
    			append_dev(div, img7);
    			append_dev(div, br4);
    			append_dev(div, t8);
    			append_dev(div, img8);
    			append_dev(div, t9);
    			append_dev(div, img9);
    			append_dev(div, t10);
    			append_dev(div, img10);
    			append_dev(div, br5);
    			append_dev(div, t11);
    			append_dev(div, img11);
    			append_dev(div, t12);
    			append_dev(div, img12);
    			append_dev(div, br6);
    			append_dev(div, t13);
    			append_dev(div, img13);
    			append_dev(div, t14);
    			append_dev(div, img14);
    			append_dev(div, br7);
    			append_dev(div, t15);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, br12);
    			append_dev(div, br13);
    			append_dev(div, br14);
    			append_dev(div, br15);
    			append_dev(div, t16);
    			append_dev(div, img15);
    			append_dev(div, t17);
    			append_dev(div, img16);
    			append_dev(div, t18);
    			append_dev(div, br16);
    			append_dev(div, br17);
    			append_dev(div, br18);
    			append_dev(div, br19);
    			append_dev(div, br20);
    			append_dev(div, br21);
    			append_dev(div, br22);
    			append_dev(div, br23);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Flora> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Flora", $$slots, []);
    	return [];
    }

    class Flora extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Flora",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    /* src/specifics/Breadmag.svelte generated by Svelte v3.23.0 */

    const file$m = "src/specifics/Breadmag.svelte";

    function create_fragment$m(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br2;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let t5;
    	let br3;
    	let br4;
    	let br5;
    	let br6;
    	let br7;
    	let br8;
    	let br9;
    	let br10;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			br2 = element("br");
    			t2 = space();
    			img2 = element("img");
    			t3 = space();
    			img3 = element("img");
    			t4 = space();
    			img4 = element("img");
    			t5 = space();
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			br6 = element("br");
    			br7 = element("br");
    			br8 = element("br");
    			br9 = element("br");
    			br10 = element("br");
    			add_location(br0, file$m, 6, 1, 54);
    			add_location(br1, file$m, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-12uxl75");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/bread/giant.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$m, 10, 1, 85);
    			attr_dev(img1, "class", "img portfolio-item svelte-12uxl75");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/bread/letthemeat.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$m, 11, 1, 159);
    			add_location(br2, file$m, 11, 78, 236);
    			attr_dev(img2, "class", "img portfolio-item svelte-12uxl75");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/bread/magclose.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$m, 12, 1, 242);
    			attr_dev(img3, "class", "img portfolio-item svelte-12uxl75");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/bread/mag1.jpg")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$m, 13, 1, 319);
    			attr_dev(img4, "class", "img portfolio-item svelte-12uxl75");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/bread/letthemeattitle.jpg")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$m, 14, 1, 392);
    			add_location(br3, file$m, 16, 1, 477);
    			add_location(br4, file$m, 16, 5, 481);
    			add_location(br5, file$m, 16, 9, 485);
    			add_location(br6, file$m, 16, 13, 489);
    			add_location(br7, file$m, 16, 17, 493);
    			add_location(br8, file$m, 16, 21, 497);
    			add_location(br9, file$m, 16, 25, 501);
    			add_location(br10, file$m, 16, 29, 505);
    			attr_dev(div, "class", "backgroundcolor svelte-12uxl75");
    			add_location(div, file$m, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, br2);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, t5);
    			append_dev(div, br3);
    			append_dev(div, br4);
    			append_dev(div, br5);
    			append_dev(div, br6);
    			append_dev(div, br7);
    			append_dev(div, br8);
    			append_dev(div, br9);
    			append_dev(div, br10);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Breadmag> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Breadmag", $$slots, []);
    	return [];
    }

    class Breadmag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Breadmag",
    			options,
    			id: create_fragment$m.name
    		});
    	}
    }

    /* src/specifics/Evublad.svelte generated by Svelte v3.23.0 */

    const file$n = "src/specifics/Evublad.svelte";

    function create_fragment$n(ctx) {
    	let div;
    	let br0;
    	let br1;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let br2;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let br3;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let br4;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let br5;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let br6;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let br7;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let br8;
    	let t7;
    	let br9;
    	let br10;
    	let br11;
    	let br12;
    	let br13;
    	let br14;
    	let br15;
    	let br16;

    	const block = {
    		c: function create() {
    			div = element("div");
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			img0 = element("img");
    			br2 = element("br");
    			t1 = space();
    			img1 = element("img");
    			br3 = element("br");
    			t2 = space();
    			img2 = element("img");
    			br4 = element("br");
    			t3 = space();
    			img3 = element("img");
    			br5 = element("br");
    			t4 = space();
    			img4 = element("img");
    			br6 = element("br");
    			t5 = space();
    			img5 = element("img");
    			br7 = element("br");
    			t6 = space();
    			img6 = element("img");
    			br8 = element("br");
    			t7 = space();
    			br9 = element("br");
    			br10 = element("br");
    			br11 = element("br");
    			br12 = element("br");
    			br13 = element("br");
    			br14 = element("br");
    			br15 = element("br");
    			br16 = element("br");
    			add_location(br0, file$n, 6, 1, 54);
    			add_location(br1, file$n, 6, 5, 58);
    			attr_dev(img0, "class", "img portfolio-item svelte-lsg2gy");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/evublad/evublad-spreads0.jpg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$n, 7, 1, 64);
    			add_location(br2, file$n, 7, 86, 149);
    			attr_dev(img1, "class", "img portfolio-item svelte-lsg2gy");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/evublad/evublad-spreads2.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$n, 8, 1, 155);
    			add_location(br3, file$n, 8, 86, 240);
    			attr_dev(img2, "class", "img portfolio-item svelte-lsg2gy");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/evublad/evublad-spreads4.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$n, 9, 1, 246);
    			add_location(br4, file$n, 9, 86, 331);
    			attr_dev(img3, "class", "img portfolio-item svelte-lsg2gy");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/evublad/evublad-spreads5.jpg")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$n, 10, 1, 337);
    			add_location(br5, file$n, 10, 86, 422);
    			attr_dev(img4, "class", "img portfolio-item svelte-lsg2gy");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/evublad/evublad-spreads6.jpg")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$n, 11, 1, 428);
    			add_location(br6, file$n, 11, 86, 513);
    			attr_dev(img5, "class", "img portfolio-item svelte-lsg2gy");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/evublad/evublad-spreads7.jpg")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$n, 12, 1, 519);
    			add_location(br7, file$n, 12, 86, 604);
    			attr_dev(img6, "class", "img portfolio-item svelte-lsg2gy");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/evublad/evublad-spreads9.jpg")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$n, 13, 1, 610);
    			add_location(br8, file$n, 13, 86, 695);
    			add_location(br9, file$n, 14, 1, 701);
    			add_location(br10, file$n, 14, 5, 705);
    			add_location(br11, file$n, 14, 9, 709);
    			add_location(br12, file$n, 14, 13, 713);
    			add_location(br13, file$n, 14, 17, 717);
    			add_location(br14, file$n, 14, 21, 721);
    			add_location(br15, file$n, 14, 25, 725);
    			add_location(br16, file$n, 14, 29, 729);
    			attr_dev(div, "class", "backgroundcolor svelte-lsg2gy");
    			add_location(div, file$n, 5, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, br0);
    			append_dev(div, br1);
    			append_dev(div, t0);
    			append_dev(div, img0);
    			append_dev(div, br2);
    			append_dev(div, t1);
    			append_dev(div, img1);
    			append_dev(div, br3);
    			append_dev(div, t2);
    			append_dev(div, img2);
    			append_dev(div, br4);
    			append_dev(div, t3);
    			append_dev(div, img3);
    			append_dev(div, br5);
    			append_dev(div, t4);
    			append_dev(div, img4);
    			append_dev(div, br6);
    			append_dev(div, t5);
    			append_dev(div, img5);
    			append_dev(div, br7);
    			append_dev(div, t6);
    			append_dev(div, img6);
    			append_dev(div, br8);
    			append_dev(div, t7);
    			append_dev(div, br9);
    			append_dev(div, br10);
    			append_dev(div, br11);
    			append_dev(div, br12);
    			append_dev(div, br13);
    			append_dev(div, br14);
    			append_dev(div, br15);
    			append_dev(div, br16);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$n($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Evublad> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Evublad", $$slots, []);
    	return [];
    }

    class Evublad extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Evublad",
    			options,
    			id: create_fragment$n.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.23.0 */
    const file$o = "src/App.svelte";

    // (124:3) {#if frontscreen}
    function create_if_block_117(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("August 2020");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_117.name,
    		type: "if",
    		source: "(124:3) {#if frontscreen}",
    		ctx
    	});

    	return block;
    }

    // (125:3) {#if onourowntime}
    function create_if_block_116(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2020");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_116.name,
    		type: "if",
    		source: "(125:3) {#if onourowntime}",
    		ctx
    	});

    	return block;
    }

    // (126:3) {#if green}
    function create_if_block_115(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Winter 2019-2020");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_115.name,
    		type: "if",
    		source: "(126:3) {#if green}",
    		ctx
    	});

    	return block;
    }

    // (127:3) {#if viv}
    function create_if_block_114(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2017");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_114.name,
    		type: "if",
    		source: "(127:3) {#if viv}",
    		ctx
    	});

    	return block;
    }

    // (128:3) {#if portfolioio}
    function create_if_block_113(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2019 - 2020");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_113.name,
    		type: "if",
    		source: "(128:3) {#if portfolioio}",
    		ctx
    	});

    	return block;
    }

    // (129:3) {#if typoposters}
    function create_if_block_112(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Autumn 2018");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_112.name,
    		type: "if",
    		source: "(129:3) {#if typoposters}",
    		ctx
    	});

    	return block;
    }

    // (130:3) {#if beauimg}
    function create_if_block_111(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2019");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_111.name,
    		type: "if",
    		source: "(130:3) {#if beauimg}",
    		ctx
    	});

    	return block;
    }

    // (131:3) {#if secret}
    function create_if_block_110(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2017");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_110.name,
    		type: "if",
    		source: "(131:3) {#if secret}",
    		ctx
    	});

    	return block;
    }

    // (132:3) {#if sortedplastic}
    function create_if_block_109(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Autumn 2018");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_109.name,
    		type: "if",
    		source: "(132:3) {#if sortedplastic}",
    		ctx
    	});

    	return block;
    }

    // (133:3) {#if oeb}
    function create_if_block_108(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2019");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_108.name,
    		type: "if",
    		source: "(133:3) {#if oeb}",
    		ctx
    	});

    	return block;
    }

    // (134:3) {#if musicposters}
    function create_if_block_107(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2019");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_107.name,
    		type: "if",
    		source: "(134:3) {#if musicposters}",
    		ctx
    	});

    	return block;
    }

    // (135:3) {#if timatal}
    function create_if_block_106(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2018");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_106.name,
    		type: "if",
    		source: "(135:3) {#if timatal}",
    		ctx
    	});

    	return block;
    }

    // (136:3) {#if tools}
    function create_if_block_105(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2018");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_105.name,
    		type: "if",
    		source: "(136:3) {#if tools}",
    		ctx
    	});

    	return block;
    }

    // (137:3) {#if trash}
    function create_if_block_104(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2018");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_104.name,
    		type: "if",
    		source: "(137:3) {#if trash}",
    		ctx
    	});

    	return block;
    }

    // (138:3) {#if musicbook}
    function create_if_block_103(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Autumn 2016");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_103.name,
    		type: "if",
    		source: "(138:3) {#if musicbook}",
    		ctx
    	});

    	return block;
    }

    // (139:3) {#if corruptedspace}
    function create_if_block_102(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2018");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_102.name,
    		type: "if",
    		source: "(139:3) {#if corruptedspace}",
    		ctx
    	});

    	return block;
    }

    // (140:3) {#if oilbuddies}
    function create_if_block_101(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2017");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_101.name,
    		type: "if",
    		source: "(140:3) {#if oilbuddies}",
    		ctx
    	});

    	return block;
    }

    // (141:3) {#if litabok}
    function create_if_block_100(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2018");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_100.name,
    		type: "if",
    		source: "(141:3) {#if litabok}",
    		ctx
    	});

    	return block;
    }

    // (142:3) {#if plastica}
    function create_if_block_99(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Autumn 2018");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_99.name,
    		type: "if",
    		source: "(142:3) {#if plastica}",
    		ctx
    	});

    	return block;
    }

    // (143:3) {#if familiarfaces}
    function create_if_block_98(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Autumn 2018");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_98.name,
    		type: "if",
    		source: "(143:3) {#if familiarfaces}",
    		ctx
    	});

    	return block;
    }

    // (144:3) {#if likamar}
    function create_if_block_97(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2019 - 2020");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_97.name,
    		type: "if",
    		source: "(144:3) {#if likamar}",
    		ctx
    	});

    	return block;
    }

    // (145:3) {#if bread}
    function create_if_block_96(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2019");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_96.name,
    		type: "if",
    		source: "(145:3) {#if bread}",
    		ctx
    	});

    	return block;
    }

    // (146:3) {#if breadmag}
    function create_if_block_95(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2019");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_95.name,
    		type: "if",
    		source: "(146:3) {#if breadmag}",
    		ctx
    	});

    	return block;
    }

    // (147:3) {#if flora}
    function create_if_block_94(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Summer 2018 - ongoing");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_94.name,
    		type: "if",
    		source: "(147:3) {#if flora}",
    		ctx
    	});

    	return block;
    }

    // (148:4) {#if evublad}
    function create_if_block_93(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spring 2018");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_93.name,
    		type: "if",
    		source: "(148:4) {#if evublad}",
    		ctx
    	});

    	return block;
    }

    // (152:3) {#if frontscreen}
    function create_if_block_92(ctx) {
    	let t0;
    	let br;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("Page last updated");
    			br = element("br");
    			t1 = text("27th of August, 2020.");
    			add_location(br, file$o, 151, 37, 15383);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_92.name,
    		type: "if",
    		source: "(152:3) {#if frontscreen}",
    		ctx
    	});

    	return block;
    }

    // (153:3) {#if onourowntime}
    function create_if_block_91(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_91.name,
    		type: "if",
    		source: "(153:3) {#if onourowntime}",
    		ctx
    	});

    	return block;
    }

    // (154:3) {#if green}
    function create_if_block_90(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_90.name,
    		type: "if",
    		source: "(154:3) {#if green}",
    		ctx
    	});

    	return block;
    }

    // (155:3) {#if viv}
    function create_if_block_89(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_89.name,
    		type: "if",
    		source: "(155:3) {#if viv}",
    		ctx
    	});

    	return block;
    }

    // (156:3) {#if bread}
    function create_if_block_88(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_88.name,
    		type: "if",
    		source: "(156:3) {#if bread}",
    		ctx
    	});

    	return block;
    }

    // (157:3) {#if breadmag}
    function create_if_block_87(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_87.name,
    		type: "if",
    		source: "(157:3) {#if breadmag}",
    		ctx
    	});

    	return block;
    }

    // (158:3) {#if portfolioio}
    function create_if_block_86(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_86.name,
    		type: "if",
    		source: "(158:3) {#if portfolioio}",
    		ctx
    	});

    	return block;
    }

    // (159:3) {#if typoposters}
    function create_if_block_85(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_85.name,
    		type: "if",
    		source: "(159:3) {#if typoposters}",
    		ctx
    	});

    	return block;
    }

    // (160:3) {#if beauimg}
    function create_if_block_84(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_84.name,
    		type: "if",
    		source: "(160:3) {#if beauimg}",
    		ctx
    	});

    	return block;
    }

    // (161:3) {#if secret}
    function create_if_block_83(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_83.name,
    		type: "if",
    		source: "(161:3) {#if secret}",
    		ctx
    	});

    	return block;
    }

    // (162:3) {#if sortedplastic}
    function create_if_block_82(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_82.name,
    		type: "if",
    		source: "(162:3) {#if sortedplastic}",
    		ctx
    	});

    	return block;
    }

    // (163:3) {#if oeb}
    function create_if_block_81(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_81.name,
    		type: "if",
    		source: "(163:3) {#if oeb}",
    		ctx
    	});

    	return block;
    }

    // (164:3) {#if musicposters}
    function create_if_block_80(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_80.name,
    		type: "if",
    		source: "(164:3) {#if musicposters}",
    		ctx
    	});

    	return block;
    }

    // (165:3) {#if timatal}
    function create_if_block_79(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_79.name,
    		type: "if",
    		source: "(165:3) {#if timatal}",
    		ctx
    	});

    	return block;
    }

    // (166:3) {#if tools}
    function create_if_block_78(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_78.name,
    		type: "if",
    		source: "(166:3) {#if tools}",
    		ctx
    	});

    	return block;
    }

    // (167:3) {#if trash}
    function create_if_block_77(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_77.name,
    		type: "if",
    		source: "(167:3) {#if trash}",
    		ctx
    	});

    	return block;
    }

    // (168:3) {#if musicbook}
    function create_if_block_76(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_76.name,
    		type: "if",
    		source: "(168:3) {#if musicbook}",
    		ctx
    	});

    	return block;
    }

    // (169:3) {#if corruptedspace}
    function create_if_block_75(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_75.name,
    		type: "if",
    		source: "(169:3) {#if corruptedspace}",
    		ctx
    	});

    	return block;
    }

    // (170:3) {#if oilbuddies}
    function create_if_block_74(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_74.name,
    		type: "if",
    		source: "(170:3) {#if oilbuddies}",
    		ctx
    	});

    	return block;
    }

    // (171:3) {#if litabok}
    function create_if_block_73(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_73.name,
    		type: "if",
    		source: "(171:3) {#if litabok}",
    		ctx
    	});

    	return block;
    }

    // (172:3) {#if plastica}
    function create_if_block_72(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_72.name,
    		type: "if",
    		source: "(172:3) {#if plastica}",
    		ctx
    	});

    	return block;
    }

    // (173:3) {#if familiarfaces}
    function create_if_block_71(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_71.name,
    		type: "if",
    		source: "(173:3) {#if familiarfaces}",
    		ctx
    	});

    	return block;
    }

    // (174:3) {#if likamar}
    function create_if_block_70(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Typeface initially designed in 2019, refined for Flóra útgáfa in 2020.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_70.name,
    		type: "if",
    		source: "(174:3) {#if likamar}",
    		ctx
    	});

    	return block;
    }

    // (175:3) {#if flora}
    function create_if_block_69(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Current website mostly designed and built in Summer 2020.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_69.name,
    		type: "if",
    		source: "(175:3) {#if flora}",
    		ctx
    	});

    	return block;
    }

    // (176:4) {#if evublad}
    function create_if_block_68(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_68.name,
    		type: "if",
    		source: "(176:4) {#if evublad}",
    		ctx
    	});

    	return block;
    }

    // (180:3) {#if frontscreen}
    function create_if_block_67(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Berglind Brá");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_67.name,
    		type: "if",
    		source: "(180:3) {#if frontscreen}",
    		ctx
    	});

    	return block;
    }

    // (181:3) {#if onourowntime}
    function create_if_block_66(ctx) {
    	let a;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "On our own time";
    			attr_dev(a, "href", "https://onourowntime.today/");
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$o, 180, 21, 16274);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_66.name,
    		type: "if",
    		source: "(181:3) {#if onourowntime}",
    		ctx
    	});

    	return block;
    }

    // (182:3) {#if green}
    function create_if_block_65(ctx) {
    	let t0;
    	let br0;
    	let t1;
    	let br1;
    	let t2;

    	const block = {
    		c: function create() {
    			t0 = text("GREEN");
    			br0 = element("br");
    			t1 = text("Towards a Guidebook");
    			br1 = element("br");
    			t2 = text("for Ecocritical Graphic Design");
    			add_location(br0, file$o, 181, 19, 16372);
    			add_location(br1, file$o, 181, 42, 16395);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_65.name,
    		type: "if",
    		source: "(182:3) {#if green}",
    		ctx
    	});

    	return block;
    }

    // (183:3) {#if viv}
    function create_if_block_64(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Vivienne Westwood by Tim Blanks");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_64.name,
    		type: "if",
    		source: "(183:3) {#if viv}",
    		ctx
    	});

    	return block;
    }

    // (184:3) {#if bread}
    function create_if_block_63(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Bread & Demonstrations");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_63.name,
    		type: "if",
    		source: "(184:3) {#if bread}",
    		ctx
    	});

    	return block;
    }

    // (185:3) {#if breadmag}
    function create_if_block_62(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("\"Let them eat Brioche\"");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_62.name,
    		type: "if",
    		source: "(185:3) {#if breadmag}",
    		ctx
    	});

    	return block;
    }

    // (186:3) {#if portfolioio}
    function create_if_block_61(ctx) {
    	let a;
    	let t0;
    	let br;
    	let t1;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text("Io Sivertsen");
    			br = element("br");
    			t1 = text("Portfolio Website");
    			add_location(br, file$o, 185, 82, 16653);
    			attr_dev(a, "href", "https://0i0i.github.io/");
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$o, 185, 20, 16591);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, br);
    			append_dev(a, t1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_61.name,
    		type: "if",
    		source: "(186:3) {#if portfolioio}",
    		ctx
    	});

    	return block;
    }

    // (187:3) {#if typoposters}
    function create_if_block_60(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("10 typefaces");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_60.name,
    		type: "if",
    		source: "(187:3) {#if typoposters}",
    		ctx
    	});

    	return block;
    }

    // (188:3) {#if beauimg}
    function create_if_block_59(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("\"Beautiful image\"");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_59.name,
    		type: "if",
    		source: "(188:3) {#if beauimg}",
    		ctx
    	});

    	return block;
    }

    // (189:3) {#if secret}
    function create_if_block_58(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Secret book");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_58.name,
    		type: "if",
    		source: "(189:3) {#if secret}",
    		ctx
    	});

    	return block;
    }

    // (190:3) {#if sortedplastic}
    function create_if_block_57(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Where does our sorted plastic go?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_57.name,
    		type: "if",
    		source: "(190:3) {#if sortedplastic}",
    		ctx
    	});

    	return block;
    }

    // (191:3) {#if oeb}
    function create_if_block_56(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("OEB");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_56.name,
    		type: "if",
    		source: "(191:3) {#if oeb}",
    		ctx
    	});

    	return block;
    }

    // (192:3) {#if musicposters}
    function create_if_block_55(ctx) {
    	let t0;
    	let br0;
    	let t1;
    	let br1;
    	let t2;

    	const block = {
    		c: function create() {
    			t0 = text("Four Corners /");
    			br0 = element("br");
    			t1 = text("Cause We've Ended As Lovers");
    			br1 = element("br");
    			t2 = text("/ Pinball");
    			add_location(br0, file$o, 191, 35, 16910);
    			add_location(br1, file$o, 191, 66, 16941);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_55.name,
    		type: "if",
    		source: "(192:3) {#if musicposters}",
    		ctx
    	});

    	return block;
    }

    // (193:3) {#if timatal}
    function create_if_block_54(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Tímatal");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_54.name,
    		type: "if",
    		source: "(193:3) {#if timatal}",
    		ctx
    	});

    	return block;
    }

    // (194:3) {#if tools}
    function create_if_block_53(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Tools of Expession");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_53.name,
    		type: "if",
    		source: "(194:3) {#if tools}",
    		ctx
    	});

    	return block;
    }

    // (195:3) {#if trash}
    function create_if_block_52(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("A(nother) Drop in the Ocean");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_52.name,
    		type: "if",
    		source: "(195:3) {#if trash}",
    		ctx
    	});

    	return block;
    }

    // (196:3) {#if musicbook}
    function create_if_block_51(ctx) {
    	let t0;
    	let br0;
    	let t1;
    	let br1;
    	let t2;
    	let br2;
    	let t3;
    	let br3;
    	let t4;

    	const block = {
    		c: function create() {
    			t0 = text("Where we're from");
    			br0 = element("br");
    			t1 = text("the birds sing a");
    			br1 = element("br");
    			t2 = text("pretty song and");
    			br2 = element("br");
    			t3 = text("there's always music");
    			br3 = element("br");
    			t4 = text("in the air.");
    			add_location(br0, file$o, 195, 34, 17108);
    			add_location(br1, file$o, 195, 54, 17128);
    			add_location(br2, file$o, 195, 73, 17147);
    			add_location(br3, file$o, 195, 97, 17171);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, br3, anchor);
    			insert_dev(target, t4, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(br2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(br3);
    			if (detaching) detach_dev(t4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_51.name,
    		type: "if",
    		source: "(196:3) {#if musicbook}",
    		ctx
    	});

    	return block;
    }

    // (197:3) {#if corruptedspace}
    function create_if_block_50(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Corrupted Space");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_50.name,
    		type: "if",
    		source: "(197:3) {#if corruptedspace}",
    		ctx
    	});

    	return block;
    }

    // (198:3) {#if oilbuddies}
    function create_if_block_49(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Bubble boys");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_49.name,
    		type: "if",
    		source: "(198:3) {#if oilbuddies}",
    		ctx
    	});

    	return block;
    }

    // (199:3) {#if litabok}
    function create_if_block_48(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("The Colorful Richness of Black and White");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_48.name,
    		type: "if",
    		source: "(199:3) {#if litabok}",
    		ctx
    	});

    	return block;
    }

    // (200:3) {#if plastica}
    function create_if_block_47(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Plastica");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_47.name,
    		type: "if",
    		source: "(200:3) {#if plastica}",
    		ctx
    	});

    	return block;
    }

    // (201:3) {#if familiarfaces}
    function create_if_block_46(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Familiar Faces");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_46.name,
    		type: "if",
    		source: "(201:3) {#if familiarfaces}",
    		ctx
    	});

    	return block;
    }

    // (202:3) {#if likamar}
    function create_if_block_45(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Untitled Typeface");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_45.name,
    		type: "if",
    		source: "(202:3) {#if likamar}",
    		ctx
    	});

    	return block;
    }

    // (203:3) {#if flora}
    function create_if_block_44(ctx) {
    	let a;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Flóra útgáfa";
    			attr_dev(a, "href", "https://flora-utgafa.is/");
    			set_style(a, "color", "lightblue", 1);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$o, 202, 14, 17460);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_44.name,
    		type: "if",
    		source: "(203:3) {#if flora}",
    		ctx
    	});

    	return block;
    }

    // (204:4) {#if evublad}
    function create_if_block_43(ctx) {
    	let t0;
    	let br;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("Artist Interview");
    			br = element("br");
    			t1 = text("Eva Sigurðardóttir");
    			add_location(br, file$o, 203, 33, 17603);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_43.name,
    		type: "if",
    		source: "(204:4) {#if evublad}",
    		ctx
    	});

    	return block;
    }

    // (208:5) {#if frontscreen}
    function create_if_block_42(ctx) {
    	let t0;
    	let br;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("Welcome to my portfolio!");
    			br = element("br");
    			t1 = text("Browse through my projects on the right and click to see more details.");
    			add_location(br, file$o, 207, 46, 17771);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_42.name,
    		type: "if",
    		source: "(208:5) {#if frontscreen}",
    		ctx
    	});

    	return block;
    }

    // (209:2) {#if onourowntime}
    function create_if_block_41(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Fundraiser / Catalogue website for Graphic Design and Non Linear Narrative, The Royal Academy of Art in The Hague, graduation class of 2020. Website design and building collaboration with Trang Ha, identity designed by Zahari Dimitrov and Zuzanna Zgierska using typefaces by Edward Dżułaj and Nedislav Kamburov.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_41.name,
    		type: "if",
    		source: "(209:2) {#if onourowntime}",
    		ctx
    	});

    	return block;
    }

    // (211:4) {#if viv}
    function create_if_block_40(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("A publication containing an interview with Vivienne Westwood by Tim Blanks (published in Interview Magazine, July 18, 2012) along with added content about topics mentioned in the interview. Printed on A3 and folded into a a-bit-wider-than-A4 format.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_40.name,
    		type: "if",
    		source: "(211:4) {#if viv}",
    		ctx
    	});

    	return block;
    }

    // (212:4) {#if typoposters}
    function create_if_block_39(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("20 posters celebrating 10 different typefaces. Printed front and back on 10 A2-sized sheets, and folded into A4 for storage.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_39.name,
    		type: "if",
    		source: "(212:4) {#if typoposters}",
    		ctx
    	});

    	return block;
    }

    // (213:2) {#if secret}
    function create_if_block_38(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("An anonymous's secret, translated into a foldout A6-size hardcover book.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_38.name,
    		type: "if",
    		source: "(213:2) {#if secret}",
    		ctx
    	});

    	return block;
    }

    // (214:2) {#if tools}
    function create_if_block_37(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("A publication holding an archive of different communication tools. A5-size.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_37.name,
    		type: "if",
    		source: "(214:2) {#if tools}",
    		ctx
    	});

    	return block;
    }

    // (215:2) {#if timatal}
    function create_if_block_36(ctx) {
    	let t0;
    	let br;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("A collection of different ideas and imaginations of time and time-keeping. A kind of non-calendar calendar.");
    			br = element("br");
    			t1 = text("Content gathered from a single book found in a library (and returned before I thought of doucumenting it (rookie mistake) so the source remains a mystery).");
    			add_location(br, file$o, 214, 122, 18946);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_36.name,
    		type: "if",
    		source: "(215:2) {#if timatal}",
    		ctx
    	});

    	return block;
    }

    // (216:2) {#if sortedplastic}
    function create_if_block_35(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("A research project, collaboration with Louana Gentner, on where plastic — sorted by residents of the Hague and delivered to local bins to be recycled — ends up. An interesting disappointment, documented in an A3-size publication and an online tetris-style game.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_35.name,
    		type: "if",
    		source: "(216:2) {#if sortedplastic}",
    		ctx
    	});

    	return block;
    }

    // (217:2) {#if litabok}
    function create_if_block_34(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("An installation and publication.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_34.name,
    		type: "if",
    		source: "(217:2) {#if litabok}",
    		ctx
    	});

    	return block;
    }

    // (218:2) {#if oilbuddies}
    function create_if_block_33(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("The heads of the worlds biggest oil-companies in 2017, in bubbles, floating around, ...headed to wherever the weahter suits their clothes?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_33.name,
    		type: "if",
    		source: "(218:2) {#if oilbuddies}",
    		ctx
    	});

    	return block;
    }

    // (219:2) {#if trash}
    function create_if_block_32(ctx) {
    	let t0;
    	let br;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("A set of stickers for the trash-bins of KABK as a call for recycling. Typeface made out of KABK's logo.");
    			br = element("br");
    			t1 = text("(...a drop in the ocean, a change in the weather)");
    			add_location(br, file$o, 218, 116, 19742);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_32.name,
    		type: "if",
    		source: "(219:2) {#if trash}",
    		ctx
    	});

    	return block;
    }

    // (220:4) {#if familiarfaces}
    function create_if_block_31(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Posters, digital and physical, made in collaboration with Seojeong Youn.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_31.name,
    		type: "if",
    		source: "(220:4) {#if familiarfaces}",
    		ctx
    	});

    	return block;
    }

    // (221:4) {#if musicbook}
    function create_if_block_30(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("A publication and a video about music's effect on humans, as seen through Stevie Wonder's 'If It's Magic', Dorothy Ashby, David Lynch, Meditation, Mantras and Patterns.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_30.name,
    		type: "if",
    		source: "(221:4) {#if musicbook}",
    		ctx
    	});

    	return block;
    }

    // (222:4) {#if plastica}
    function create_if_block_29(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("A Website and A Chrome extension, where I recreated Google as Plastica. A merging of two (supposedly) integral parts of my life.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_29.name,
    		type: "if",
    		source: "(222:4) {#if plastica}",
    		ctx
    	});

    	return block;
    }

    // (223:4) {#if corruptedspace}
    function create_if_block_28(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Posters, digital and physical, for a lecture series organized by INSIDE Master Interior Architecture and IAFD.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_28.name,
    		type: "if",
    		source: "(223:4) {#if corruptedspace}",
    		ctx
    	});

    	return block;
    }

    // (229:4) {#if likamar}
    function create_if_block_27(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Typeface initially designed in 2019, refined for Flóra útgáfa in 2020.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_27.name,
    		type: "if",
    		source: "(229:4) {#if likamar}",
    		ctx
    	});

    	return block;
    }

    // (230:4) {#if green}
    function create_if_block_26(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Graphic Design Bachelor thesis from Royal Academy of Art, the Hague.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_26.name,
    		type: "if",
    		source: "(230:4) {#if green}",
    		ctx
    	});

    	return block;
    }

    // (231:6) {#if evublad}
    function create_if_block_25(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Studio visit and interview with artist Eva Sigurðardóttir. Eva's handwriting is used to translate integral parts of the interview from Icelandic to English.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_25.name,
    		type: "if",
    		source: "(231:6) {#if evublad}",
    		ctx
    	});

    	return block;
    }

    // (235:2) {#if onourowntime}
    function create_if_block_24(ctx) {
    	let current;
    	const onourowntime_1 = new Onourowntime({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(onourowntime_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(onourowntime_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(onourowntime_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(onourowntime_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(onourowntime_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_24.name,
    		type: "if",
    		source: "(235:2) {#if onourowntime}",
    		ctx
    	});

    	return block;
    }

    // (236:2) {#if green}
    function create_if_block_23(ctx) {
    	let current;
    	const green_1 = new Green({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(green_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(green_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(green_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(green_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(green_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_23.name,
    		type: "if",
    		source: "(236:2) {#if green}",
    		ctx
    	});

    	return block;
    }

    // (237:2) {#if viv}
    function create_if_block_22(ctx) {
    	let current;
    	const vivienne = new Vivienne({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(vivienne.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(vivienne, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(vivienne.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(vivienne.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(vivienne, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_22.name,
    		type: "if",
    		source: "(237:2) {#if viv}",
    		ctx
    	});

    	return block;
    }

    // (238:2) {#if portfolioio}
    function create_if_block_21(ctx) {
    	let current;
    	const portfolioio_1 = new Portfolioio({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(portfolioio_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(portfolioio_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(portfolioio_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(portfolioio_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(portfolioio_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_21.name,
    		type: "if",
    		source: "(238:2) {#if portfolioio}",
    		ctx
    	});

    	return block;
    }

    // (239:2) {#if typoposters}
    function create_if_block_20(ctx) {
    	let current;
    	const typoposters_1 = new Typoposters({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(typoposters_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(typoposters_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(typoposters_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(typoposters_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(typoposters_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_20.name,
    		type: "if",
    		source: "(239:2) {#if typoposters}",
    		ctx
    	});

    	return block;
    }

    // (240:2) {#if secret}
    function create_if_block_19(ctx) {
    	let current;
    	const secret_1 = new Secret({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(secret_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(secret_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(secret_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(secret_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(secret_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_19.name,
    		type: "if",
    		source: "(240:2) {#if secret}",
    		ctx
    	});

    	return block;
    }

    // (241:2) {#if sortedplastic}
    function create_if_block_18(ctx) {
    	let current;
    	const sortedplastic_1 = new Sorted_plastic({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sortedplastic_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sortedplastic_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sortedplastic_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sortedplastic_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sortedplastic_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_18.name,
    		type: "if",
    		source: "(241:2) {#if sortedplastic}",
    		ctx
    	});

    	return block;
    }

    // (242:2) {#if musicposters}
    function create_if_block_17(ctx) {
    	let current;
    	const musicposters_1 = new Musicposters({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(musicposters_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(musicposters_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(musicposters_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(musicposters_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(musicposters_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_17.name,
    		type: "if",
    		source: "(242:2) {#if musicposters}",
    		ctx
    	});

    	return block;
    }

    // (243:2) {#if timatal}
    function create_if_block_16(ctx) {
    	let current;
    	const timatal_1 = new Timatal({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(timatal_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(timatal_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(timatal_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(timatal_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(timatal_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_16.name,
    		type: "if",
    		source: "(243:2) {#if timatal}",
    		ctx
    	});

    	return block;
    }

    // (244:2) {#if tools}
    function create_if_block_15(ctx) {
    	let current;
    	const toolsofexpression = new ToolsOfExpression({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(toolsofexpression.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(toolsofexpression, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(toolsofexpression.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(toolsofexpression.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(toolsofexpression, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(244:2) {#if tools}",
    		ctx
    	});

    	return block;
    }

    // (245:2) {#if trash}
    function create_if_block_14(ctx) {
    	let current;
    	const trash_1 = new Trash({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(trash_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(trash_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(trash_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(trash_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(trash_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(245:2) {#if trash}",
    		ctx
    	});

    	return block;
    }

    // (246:2) {#if musicbook}
    function create_if_block_13(ctx) {
    	let current;
    	const musicbook_1 = new MusicBook({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(musicbook_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(musicbook_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(musicbook_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(musicbook_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(musicbook_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(246:2) {#if musicbook}",
    		ctx
    	});

    	return block;
    }

    // (247:2) {#if corruptedspace}
    function create_if_block_12(ctx) {
    	let current;
    	const corrupted = new Corrupted({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(corrupted.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(corrupted, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(corrupted.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(corrupted.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(corrupted, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(247:2) {#if corruptedspace}",
    		ctx
    	});

    	return block;
    }

    // (248:2) {#if oilbuddies}
    function create_if_block_11(ctx) {
    	let current;
    	const oilbuddies_1 = new OilBuddies({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(oilbuddies_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(oilbuddies_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(oilbuddies_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(oilbuddies_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(oilbuddies_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(248:2) {#if oilbuddies}",
    		ctx
    	});

    	return block;
    }

    // (249:2) {#if litabok}
    function create_if_block_10(ctx) {
    	let current;
    	const litabok_1 = new Litabok({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(litabok_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(litabok_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(litabok_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(litabok_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(litabok_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(249:2) {#if litabok}",
    		ctx
    	});

    	return block;
    }

    // (250:2) {#if plastica}
    function create_if_block_9(ctx) {
    	let current;
    	const plastica_1 = new Plastica({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(plastica_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(plastica_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(plastica_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(plastica_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(plastica_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(250:2) {#if plastica}",
    		ctx
    	});

    	return block;
    }

    // (251:2) {#if familiarfaces}
    function create_if_block_8(ctx) {
    	let current;
    	const familiarfaces_1 = new FamiliarFaces({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(familiarfaces_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(familiarfaces_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(familiarfaces_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(familiarfaces_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(familiarfaces_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(251:2) {#if familiarfaces}",
    		ctx
    	});

    	return block;
    }

    // (252:2) {#if likamar}
    function create_if_block_7(ctx) {
    	let current;
    	const likamar_1 = new Likamar({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(likamar_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(likamar_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(likamar_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(likamar_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(likamar_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(252:2) {#if likamar}",
    		ctx
    	});

    	return block;
    }

    // (253:2) {#if oeb}
    function create_if_block_6(ctx) {
    	let current;
    	const oeb_1 = new Oeb({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(oeb_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(oeb_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(oeb_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(oeb_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(oeb_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(253:2) {#if oeb}",
    		ctx
    	});

    	return block;
    }

    // (254:2) {#if beauimg}
    function create_if_block_5(ctx) {
    	let current;
    	const beauimg_1 = new Beauimg({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(beauimg_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(beauimg_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(beauimg_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(beauimg_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(beauimg_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(254:2) {#if beauimg}",
    		ctx
    	});

    	return block;
    }

    // (255:2) {#if bread}
    function create_if_block_4(ctx) {
    	let current;
    	const bread_1 = new Bread({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(bread_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(bread_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bread_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bread_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(bread_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(255:2) {#if bread}",
    		ctx
    	});

    	return block;
    }

    // (256:2) {#if flora}
    function create_if_block_3(ctx) {
    	let current;
    	const flora_1 = new Flora({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(flora_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(flora_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flora_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flora_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(flora_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(256:2) {#if flora}",
    		ctx
    	});

    	return block;
    }

    // (257:2) {#if breadmag}
    function create_if_block_2(ctx) {
    	let current;
    	const breadmag_1 = new Breadmag({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(breadmag_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(breadmag_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(breadmag_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(breadmag_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(breadmag_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(257:2) {#if breadmag}",
    		ctx
    	});

    	return block;
    }

    // (258:2) {#if evublad}
    function create_if_block_1(ctx) {
    	let current;
    	const evublad_1 = new Evublad({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(evublad_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(evublad_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(evublad_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(evublad_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(evublad_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(258:2) {#if evublad}",
    		ctx
    	});

    	return block;
    }

    // (337:4) {#if other}
    function create_if_block(ctx) {
    	let div;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let t4;
    	let img4;
    	let img4_src_value;
    	let t5;
    	let img5;
    	let img5_src_value;
    	let t6;
    	let img6;
    	let img6_src_value;
    	let t7;
    	let img7;
    	let img7_src_value;
    	let t8;
    	let img8;
    	let img8_src_value;
    	let t9;
    	let img9;
    	let img9_src_value;
    	let t10;
    	let img10;
    	let img10_src_value;
    	let t11;
    	let img11;
    	let img11_src_value;
    	let t12;
    	let img12;
    	let img12_src_value;
    	let t13;
    	let img13;
    	let img13_src_value;
    	let t14;
    	let img14;
    	let img14_src_value;
    	let t15;
    	let img15;
    	let img15_src_value;
    	let t16;
    	let img16;
    	let img16_src_value;
    	let t17;
    	let img17;
    	let img17_src_value;
    	let t18;
    	let img18;
    	let img18_src_value;
    	let t19;
    	let img19;
    	let img19_src_value;
    	let t20;
    	let img20;
    	let img20_src_value;
    	let t21;
    	let img21;
    	let img21_src_value;
    	let t22;
    	let img22;
    	let img22_src_value;
    	let t23;
    	let img23;
    	let img23_src_value;
    	let t24;
    	let img24;
    	let img24_src_value;
    	let t25;
    	let img25;
    	let img25_src_value;
    	let t26;
    	let img26;
    	let img26_src_value;
    	let t27;
    	let img27;
    	let img27_src_value;
    	let t28;
    	let img28;
    	let img28_src_value;
    	let t29;
    	let img29;
    	let img29_src_value;
    	let t30;
    	let img30;
    	let img30_src_value;
    	let t31;
    	let img31;
    	let img31_src_value;
    	let t32;
    	let img32;
    	let img32_src_value;
    	let t33;
    	let img33;
    	let img33_src_value;
    	let t34;
    	let img34;
    	let img34_src_value;
    	let t35;
    	let img35;
    	let img35_src_value;
    	let t36;
    	let img36;
    	let img36_src_value;
    	let t37;
    	let img37;
    	let img37_src_value;
    	let t38;
    	let img38;
    	let img38_src_value;
    	let t39;
    	let img39;
    	let img39_src_value;
    	let t40;
    	let br0;
    	let br1;
    	let br2;
    	let br3;
    	let br4;
    	let br5;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			t2 = space();
    			img2 = element("img");
    			t3 = space();
    			img3 = element("img");
    			t4 = space();
    			img4 = element("img");
    			t5 = space();
    			img5 = element("img");
    			t6 = space();
    			img6 = element("img");
    			t7 = space();
    			img7 = element("img");
    			t8 = space();
    			img8 = element("img");
    			t9 = space();
    			img9 = element("img");
    			t10 = space();
    			img10 = element("img");
    			t11 = space();
    			img11 = element("img");
    			t12 = space();
    			img12 = element("img");
    			t13 = space();
    			img13 = element("img");
    			t14 = space();
    			img14 = element("img");
    			t15 = space();
    			img15 = element("img");
    			t16 = space();
    			img16 = element("img");
    			t17 = space();
    			img17 = element("img");
    			t18 = space();
    			img18 = element("img");
    			t19 = space();
    			img19 = element("img");
    			t20 = space();
    			img20 = element("img");
    			t21 = space();
    			img21 = element("img");
    			t22 = space();
    			img22 = element("img");
    			t23 = space();
    			img23 = element("img");
    			t24 = space();
    			img24 = element("img");
    			t25 = space();
    			img25 = element("img");
    			t26 = space();
    			img26 = element("img");
    			t27 = space();
    			img27 = element("img");
    			t28 = space();
    			img28 = element("img");
    			t29 = space();
    			img29 = element("img");
    			t30 = space();
    			img30 = element("img");
    			t31 = space();
    			img31 = element("img");
    			t32 = space();
    			img32 = element("img");
    			t33 = space();
    			img33 = element("img");
    			t34 = space();
    			img34 = element("img");
    			t35 = space();
    			img35 = element("img");
    			t36 = space();
    			img36 = element("img");
    			t37 = space();
    			img37 = element("img");
    			t38 = space();
    			img38 = element("img");
    			t39 = space();
    			img39 = element("img");
    			t40 = space();
    			br0 = element("br");
    			br1 = element("br");
    			br2 = element("br");
    			br3 = element("br");
    			br4 = element("br");
    			br5 = element("br");
    			attr_dev(div, "class", "line svelte-1eguo3s");
    			add_location(div, file$o, 337, 5, 26965);
    			attr_dev(img0, "class", "mediumPic");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/undefined-teikningar/ulines.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$o, 340, 5, 27080);
    			attr_dev(img1, "class", "mediumPic");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/undefined-teikningar/upprodun3rettmeddrasli2.jpg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$o, 341, 5, 27163);
    			attr_dev(img2, "class", "mediumPic");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/undefined-undefined/organo.jpg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$o, 342, 5, 27263);
    			attr_dev(img3, "class", "mediumPic");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/undefined-posters/2.jpg")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$o, 343, 5, 27345);
    			attr_dev(img4, "class", "mediumPic");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/undefined-undefined/toomuchtoseelevel.jpg")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$o, 344, 5, 27420);
    			attr_dev(img5, "class", "mediumPic");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/undefined-undefined/aproverb.jpg")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$o, 345, 5, 27513);
    			attr_dev(img6, "class", "mediumPic");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/undefined-undefined/blubb_Page_14b.jpg")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$o, 349, 5, 27872);
    			attr_dev(img7, "class", "mediumPic");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/undefined-undefined/5utgafa-ut.jpg")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$o, 352, 5, 28154);
    			attr_dev(img8, "class", "mediumPic");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/cali/cali1.jpg")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$o, 356, 5, 28497);
    			attr_dev(img9, "class", "mediumPic");
    			attr_dev(img9, "alt", "mynd");
    			if (img9.src !== (img9_src_value = "igms/cali/cali3.jpg")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$o, 358, 5, 28647);
    			attr_dev(img10, "class", "mediumPic");
    			attr_dev(img10, "alt", "mynd");
    			if (img10.src !== (img10_src_value = "igms/undefined-undefined/smallbaby.png")) attr_dev(img10, "src", img10_src_value);
    			add_location(img10, file$o, 360, 5, 28786);
    			attr_dev(img11, "class", "mediumPic");
    			attr_dev(img11, "alt", "mynd");
    			if (img11.src !== (img11_src_value = "igms/undefined-undefined/5red1.png")) attr_dev(img11, "src", img11_src_value);
    			add_location(img11, file$o, 361, 5, 28871);
    			attr_dev(img12, "class", "mediumPic");
    			attr_dev(img12, "alt", "mynd");
    			if (img12.src !== (img12_src_value = "igms/undefined-undefined/ok.gif")) attr_dev(img12, "src", img12_src_value);
    			add_location(img12, file$o, 362, 5, 28952);
    			attr_dev(img13, "class", "mediumPic");
    			attr_dev(img13, "alt", "mynd");
    			if (img13.src !== (img13_src_value = "igms/undefined-undefined/mynd12.png")) attr_dev(img13, "src", img13_src_value);
    			add_location(img13, file$o, 363, 6, 29031);
    			attr_dev(img14, "class", "mediumPic");
    			attr_dev(img14, "alt", "mynd");
    			set_style(img14, "max-width", "30vw");
    			if (img14.src !== (img14_src_value = "igms/undefined-posters/KABKPuppyParade.jpg")) attr_dev(img14, "src", img14_src_value);
    			add_location(img14, file$o, 365, 5, 29206);
    			attr_dev(img15, "class", "mediumPic");
    			attr_dev(img15, "alt", "mynd");
    			if (img15.src !== (img15_src_value = "igms/undefined-undefined/typography.jpg")) attr_dev(img15, "src", img15_src_value);
    			add_location(img15, file$o, 366, 6, 29321);
    			attr_dev(img16, "class", "mediumPic");
    			attr_dev(img16, "alt", "mynd");
    			if (img16.src !== (img16_src_value = "igms/undefined-undefined/5web.jpg")) attr_dev(img16, "src", img16_src_value);
    			add_location(img16, file$o, 369, 6, 29587);
    			attr_dev(img17, "class", "mediumPic");
    			attr_dev(img17, "alt", "mynd");
    			if (img17.src !== (img17_src_value = "igms/undefined-undefined/skoh.jpg")) attr_dev(img17, "src", img17_src_value);
    			add_location(img17, file$o, 370, 5, 29667);
    			attr_dev(img18, "class", "mediumPic");
    			attr_dev(img18, "alt", "mynd");
    			if (img18.src !== (img18_src_value = "igms/undefined-undefined/rammi.jpg")) attr_dev(img18, "src", img18_src_value);
    			add_location(img18, file$o, 371, 5, 29747);
    			attr_dev(img19, "class", "mediumPic");
    			attr_dev(img19, "alt", "mynd");
    			set_style(img19, "max-width", "30vw");
    			if (img19.src !== (img19_src_value = "igms/undefined-undefined/spurn.png")) attr_dev(img19, "src", img19_src_value);
    			add_location(img19, file$o, 372, 5, 29828);
    			attr_dev(img20, "class", "mediumPic");
    			attr_dev(img20, "alt", "mynd");
    			if (img20.src !== (img20_src_value = "igms/undefined-undefined/blomnytt2.jpg")) attr_dev(img20, "src", img20_src_value);
    			add_location(img20, file$o, 373, 6, 29935);
    			attr_dev(img21, "class", "mediumPic");
    			attr_dev(img21, "alt", "mynd");
    			if (img21.src !== (img21_src_value = "igms/undefined-undefined/mamma.jpg")) attr_dev(img21, "src", img21_src_value);
    			add_location(img21, file$o, 374, 6, 30021);
    			attr_dev(img22, "class", "mediumPic");
    			attr_dev(img22, "alt", "mynd");
    			if (img22.src !== (img22_src_value = "igms/undefined-undefined/oohnoo.gif")) attr_dev(img22, "src", img22_src_value);
    			add_location(img22, file$o, 375, 5, 30102);
    			attr_dev(img23, "class", "mediumPic");
    			attr_dev(img23, "alt", "mynd");
    			if (img23.src !== (img23_src_value = "igms/undefined-undefined/front.png")) attr_dev(img23, "src", img23_src_value);
    			add_location(img23, file$o, 376, 5, 30184);
    			attr_dev(img24, "class", "mediumPic");
    			attr_dev(img24, "alt", "mynd");
    			if (img24.src !== (img24_src_value = "igms/undefined-undefined/display1.jpg")) attr_dev(img24, "src", img24_src_value);
    			add_location(img24, file$o, 378, 6, 30364);
    			attr_dev(img25, "class", "mediumPic");
    			attr_dev(img25, "alt", "mynd");
    			if (img25.src !== (img25_src_value = "igms/undefined-undefined/display2.jpg")) attr_dev(img25, "src", img25_src_value);
    			add_location(img25, file$o, 379, 6, 30449);
    			attr_dev(img26, "class", "mediumPic");
    			attr_dev(img26, "alt", "mynd");
    			if (img26.src !== (img26_src_value = "igms/undefined-undefined/display3.jpg")) attr_dev(img26, "src", img26_src_value);
    			add_location(img26, file$o, 380, 6, 30534);
    			attr_dev(img27, "class", "mediumPic");
    			attr_dev(img27, "alt", "mynd");
    			if (img27.src !== (img27_src_value = "igms/undefined-ljosmyndir/tschlin.jpg")) attr_dev(img27, "src", img27_src_value);
    			add_location(img27, file$o, 381, 6, 30619);
    			attr_dev(img28, "class", "mediumPic");
    			attr_dev(img28, "alt", "mynd");
    			if (img28.src !== (img28_src_value = "igms/undefined-ljosmyndir/simiafjalli.jpg")) attr_dev(img28, "src", img28_src_value);
    			add_location(img28, file$o, 382, 6, 30704);
    			attr_dev(img29, "class", "mediumPic");
    			attr_dev(img29, "alt", "mynd");
    			if (img29.src !== (img29_src_value = "igms/undefined-ljosmyndir/fjall.jpg")) attr_dev(img29, "src", img29_src_value);
    			add_location(img29, file$o, 384, 6, 30886);
    			attr_dev(img30, "class", "mediumPic");
    			attr_dev(img30, "alt", "mynd");
    			if (img30.src !== (img30_src_value = "igms/undefined-posters/otherPoster.jpg")) attr_dev(img30, "src", img30_src_value);
    			add_location(img30, file$o, 387, 6, 31164);
    			attr_dev(img31, "class", "mediumPic");
    			attr_dev(img31, "alt", "mynd");
    			if (img31.src !== (img31_src_value = "igms/undefined-teikningar/teikning1.jpg")) attr_dev(img31, "src", img31_src_value);
    			add_location(img31, file$o, 388, 6, 31250);
    			attr_dev(img32, "class", "mediumPic");
    			attr_dev(img32, "alt", "mynd");
    			if (img32.src !== (img32_src_value = "igms/undefined-teikningar/teikning2.jpg")) attr_dev(img32, "src", img32_src_value);
    			add_location(img32, file$o, 389, 6, 31337);
    			attr_dev(img33, "class", "mediumPic");
    			attr_dev(img33, "alt", "mynd");
    			if (img33.src !== (img33_src_value = "igms/undefined-teikningar/teikning3.jpg")) attr_dev(img33, "src", img33_src_value);
    			add_location(img33, file$o, 390, 6, 31424);
    			attr_dev(img34, "class", "mediumPic");
    			attr_dev(img34, "alt", "mynd");
    			set_style(img34, "border-radius", "120px");
    			if (img34.src !== (img34_src_value = "igms/undefined-undefined/_.jpg")) attr_dev(img34, "src", img34_src_value);
    			add_location(img34, file$o, 391, 6, 31511);
    			attr_dev(img35, "class", "mediumPic");
    			attr_dev(img35, "alt", "mynd");
    			if (img35.src !== (img35_src_value = "igms/undefined-web/7.jpg")) attr_dev(img35, "src", img35_src_value);
    			add_location(img35, file$o, 392, 6, 31619);
    			attr_dev(img36, "class", "mediumPic");
    			attr_dev(img36, "alt", "mynd");
    			if (img36.src !== (img36_src_value = "igms/undefined-undefined/15.png")) attr_dev(img36, "src", img36_src_value);
    			add_location(img36, file$o, 393, 6, 31691);
    			attr_dev(img37, "class", "mediumPic");
    			attr_dev(img37, "alt", "mynd");
    			if (img37.src !== (img37_src_value = "igms/undefined-undefined/14.png")) attr_dev(img37, "src", img37_src_value);
    			add_location(img37, file$o, 394, 6, 31770);
    			attr_dev(img38, "class", "mediumPic");
    			attr_dev(img38, "alt", "mynd");
    			if (img38.src !== (img38_src_value = "igms/undefined-undefined/1.png")) attr_dev(img38, "src", img38_src_value);
    			add_location(img38, file$o, 396, 6, 31935);
    			attr_dev(img39, "class", "mediumPic");
    			attr_dev(img39, "alt", "mynd");
    			if (img39.src !== (img39_src_value = "igms/undefined-undefined/aSmalltable.png")) attr_dev(img39, "src", img39_src_value);
    			add_location(img39, file$o, 397, 6, 32013);
    			add_location(br0, file$o, 398, 6, 32101);
    			add_location(br1, file$o, 398, 10, 32105);
    			add_location(br2, file$o, 398, 14, 32109);
    			add_location(br3, file$o, 398, 18, 32113);
    			add_location(br4, file$o, 398, 22, 32117);
    			add_location(br5, file$o, 398, 26, 32121);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, img0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, img1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, img2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, img3, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, img4, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, img5, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, img6, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, img7, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, img8, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, img9, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, img10, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, img11, anchor);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, img12, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, img13, anchor);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, img14, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, img15, anchor);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, img16, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, img17, anchor);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, img18, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, img19, anchor);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, img20, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, img21, anchor);
    			insert_dev(target, t22, anchor);
    			insert_dev(target, img22, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, img23, anchor);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, img24, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, img25, anchor);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, img26, anchor);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, img27, anchor);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, img28, anchor);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, img29, anchor);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, img30, anchor);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, img31, anchor);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, img32, anchor);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, img33, anchor);
    			insert_dev(target, t34, anchor);
    			insert_dev(target, img34, anchor);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, img35, anchor);
    			insert_dev(target, t36, anchor);
    			insert_dev(target, img36, anchor);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, img37, anchor);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, img38, anchor);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, img39, anchor);
    			insert_dev(target, t40, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, br3, anchor);
    			insert_dev(target, br4, anchor);
    			insert_dev(target, br5, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(img0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(img1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(img2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(img3);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(img4);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(img5);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(img6);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(img7);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(img8);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(img9);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(img10);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(img11);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(img12);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(img13);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(img14);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(img15);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(img16);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(img17);
    			if (detaching) detach_dev(t18);
    			if (detaching) detach_dev(img18);
    			if (detaching) detach_dev(t19);
    			if (detaching) detach_dev(img19);
    			if (detaching) detach_dev(t20);
    			if (detaching) detach_dev(img20);
    			if (detaching) detach_dev(t21);
    			if (detaching) detach_dev(img21);
    			if (detaching) detach_dev(t22);
    			if (detaching) detach_dev(img22);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(img23);
    			if (detaching) detach_dev(t24);
    			if (detaching) detach_dev(img24);
    			if (detaching) detach_dev(t25);
    			if (detaching) detach_dev(img25);
    			if (detaching) detach_dev(t26);
    			if (detaching) detach_dev(img26);
    			if (detaching) detach_dev(t27);
    			if (detaching) detach_dev(img27);
    			if (detaching) detach_dev(t28);
    			if (detaching) detach_dev(img28);
    			if (detaching) detach_dev(t29);
    			if (detaching) detach_dev(img29);
    			if (detaching) detach_dev(t30);
    			if (detaching) detach_dev(img30);
    			if (detaching) detach_dev(t31);
    			if (detaching) detach_dev(img31);
    			if (detaching) detach_dev(t32);
    			if (detaching) detach_dev(img32);
    			if (detaching) detach_dev(t33);
    			if (detaching) detach_dev(img33);
    			if (detaching) detach_dev(t34);
    			if (detaching) detach_dev(img34);
    			if (detaching) detach_dev(t35);
    			if (detaching) detach_dev(img35);
    			if (detaching) detach_dev(t36);
    			if (detaching) detach_dev(img36);
    			if (detaching) detach_dev(t37);
    			if (detaching) detach_dev(img37);
    			if (detaching) detach_dev(t38);
    			if (detaching) detach_dev(img38);
    			if (detaching) detach_dev(t39);
    			if (detaching) detach_dev(img39);
    			if (detaching) detach_dev(t40);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(br2);
    			if (detaching) detach_dev(br3);
    			if (detaching) detach_dev(br4);
    			if (detaching) detach_dev(br5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(337:4) {#if other}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$o(ctx) {
    	let div5;
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let t14;
    	let t15;
    	let t16;
    	let t17;
    	let t18;
    	let t19;
    	let t20;
    	let t21;
    	let t22;
    	let t23;
    	let t24;
    	let t25;
    	let t26;
    	let div2;
    	let span0;
    	let t27;
    	let t28;
    	let t29;
    	let t30;
    	let t31;
    	let t32;
    	let t33;
    	let t34;
    	let t35;
    	let t36;
    	let t37;
    	let t38;
    	let t39;
    	let t40;
    	let t41;
    	let t42;
    	let t43;
    	let t44;
    	let t45;
    	let t46;
    	let t47;
    	let t48;
    	let t49;
    	let t50;
    	let t51;
    	let div3;
    	let t52;
    	let t53;
    	let t54;
    	let t55;
    	let t56;
    	let t57;
    	let t58;
    	let t59;
    	let t60;
    	let t61;
    	let t62;
    	let t63;
    	let t64;
    	let t65;
    	let t66;
    	let t67;
    	let t68;
    	let t69;
    	let t70;
    	let t71;
    	let t72;
    	let t73;
    	let t74;
    	let t75;
    	let t76;
    	let div4;
    	let span1;
    	let t77;
    	let t78;
    	let t79;
    	let t80;
    	let t81;
    	let t82;
    	let t83;
    	let t84;
    	let t85;
    	let t86;
    	let t87;
    	let t88;
    	let t89;
    	let t90;
    	let t91;
    	let t92;
    	let t93;
    	let t94;
    	let t95;
    	let t96;
    	let t97;
    	let t98;
    	let t99;
    	let t100;
    	let t101;
    	let t102;
    	let t103;
    	let t104;
    	let t105;
    	let t106;
    	let t107;
    	let t108;
    	let t109;
    	let t110;
    	let t111;
    	let t112;
    	let t113;
    	let t114;
    	let t115;
    	let t116;
    	let t117;
    	let t118;
    	let div7;
    	let div6;
    	let img0;
    	let img0_src_value;
    	let br0;
    	let br1;
    	let t119;
    	let br2;
    	let br3;
    	let t120;
    	let i0;
    	let br4;
    	let t122;
    	let br5;
    	let t123;
    	let br6;
    	let br7;
    	let t124;
    	let span2;
    	let i1;
    	let br8;
    	let t126;
    	let br9;
    	let t127;
    	let br10;
    	let t128;
    	let br11;
    	let br12;
    	let t129;
    	let i2;
    	let br13;
    	let t131;
    	let br14;
    	let t132;
    	let span3;
    	let br15;
    	let br16;
    	let t133;
    	let t134;
    	let div11;
    	let div10;
    	let div8;
    	let t136;
    	let div9;
    	let t137;
    	let br17;
    	let br18;
    	let t138;
    	let img1;
    	let img1_src_value;
    	let t139;
    	let img2;
    	let img2_src_value;
    	let t140;
    	let img3;
    	let img3_src_value;
    	let t141;
    	let img4;
    	let img4_src_value;
    	let t142;
    	let img5;
    	let img5_src_value;
    	let t143;
    	let img6;
    	let img6_src_value;
    	let t144;
    	let img7;
    	let img7_src_value;
    	let t145;
    	let img8;
    	let img8_src_value;
    	let t146;
    	let img9;
    	let img9_src_value;
    	let t147;
    	let img10;
    	let img10_src_value;
    	let t148;
    	let img11;
    	let img11_src_value;
    	let t149;
    	let img12;
    	let img12_src_value;
    	let t150;
    	let img13;
    	let img13_src_value;
    	let t151;
    	let img14;
    	let img14_src_value;
    	let t152;
    	let img15;
    	let img15_src_value;
    	let t153;
    	let img16;
    	let img16_src_value;
    	let t154;
    	let img17;
    	let img17_src_value;
    	let t155;
    	let img18;
    	let img18_src_value;
    	let t156;
    	let img19;
    	let img19_src_value;
    	let t157;
    	let img20;
    	let img20_src_value;
    	let t158;
    	let img21;
    	let img21_src_value;
    	let t159;
    	let img22;
    	let img22_src_value;
    	let t160;
    	let img23;
    	let img23_src_value;
    	let t161;
    	let img24;
    	let img24_src_value;
    	let t162;
    	let img25;
    	let img25_src_value;
    	let t163;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*frontscreen*/ ctx[1] && create_if_block_117(ctx);
    	let if_block1 = /*onourowntime*/ ctx[2] && create_if_block_116(ctx);
    	let if_block2 = /*green*/ ctx[3] && create_if_block_115(ctx);
    	let if_block3 = /*viv*/ ctx[4] && create_if_block_114(ctx);
    	let if_block4 = /*portfolioio*/ ctx[7] && create_if_block_113(ctx);
    	let if_block5 = /*typoposters*/ ctx[5] && create_if_block_112(ctx);
    	let if_block6 = /*beauimg*/ ctx[21] && create_if_block_111(ctx);
    	let if_block7 = /*secret*/ ctx[6] && create_if_block_110(ctx);
    	let if_block8 = /*sortedplastic*/ ctx[8] && create_if_block_109(ctx);
    	let if_block9 = /*oeb*/ ctx[20] && create_if_block_108(ctx);
    	let if_block10 = /*musicposters*/ ctx[9] && create_if_block_107(ctx);
    	let if_block11 = /*timatal*/ ctx[10] && create_if_block_106(ctx);
    	let if_block12 = /*tools*/ ctx[11] && create_if_block_105(ctx);
    	let if_block13 = /*trash*/ ctx[12] && create_if_block_104(ctx);
    	let if_block14 = /*musicbook*/ ctx[13] && create_if_block_103(ctx);
    	let if_block15 = /*corruptedspace*/ ctx[14] && create_if_block_102(ctx);
    	let if_block16 = /*oilbuddies*/ ctx[15] && create_if_block_101(ctx);
    	let if_block17 = /*litabok*/ ctx[16] && create_if_block_100(ctx);
    	let if_block18 = /*plastica*/ ctx[17] && create_if_block_99(ctx);
    	let if_block19 = /*familiarfaces*/ ctx[18] && create_if_block_98(ctx);
    	let if_block20 = /*likamar*/ ctx[19] && create_if_block_97(ctx);
    	let if_block21 = /*bread*/ ctx[22] && create_if_block_96(ctx);
    	let if_block22 = /*breadmag*/ ctx[24] && create_if_block_95(ctx);
    	let if_block23 = /*flora*/ ctx[23] && create_if_block_94(ctx);
    	let if_block24 = /*evublad*/ ctx[25] && create_if_block_93(ctx);
    	let if_block25 = /*frontscreen*/ ctx[1] && create_if_block_92(ctx);
    	let if_block26 = /*onourowntime*/ ctx[2] && create_if_block_91(ctx);
    	let if_block27 = /*green*/ ctx[3] && create_if_block_90(ctx);
    	let if_block28 = /*viv*/ ctx[4] && create_if_block_89(ctx);
    	let if_block29 = /*bread*/ ctx[22] && create_if_block_88(ctx);
    	let if_block30 = /*breadmag*/ ctx[24] && create_if_block_87(ctx);
    	let if_block31 = /*portfolioio*/ ctx[7] && create_if_block_86(ctx);
    	let if_block32 = /*typoposters*/ ctx[5] && create_if_block_85(ctx);
    	let if_block33 = /*beauimg*/ ctx[21] && create_if_block_84(ctx);
    	let if_block34 = /*secret*/ ctx[6] && create_if_block_83(ctx);
    	let if_block35 = /*sortedplastic*/ ctx[8] && create_if_block_82(ctx);
    	let if_block36 = /*oeb*/ ctx[20] && create_if_block_81(ctx);
    	let if_block37 = /*musicposters*/ ctx[9] && create_if_block_80(ctx);
    	let if_block38 = /*timatal*/ ctx[10] && create_if_block_79(ctx);
    	let if_block39 = /*tools*/ ctx[11] && create_if_block_78(ctx);
    	let if_block40 = /*trash*/ ctx[12] && create_if_block_77(ctx);
    	let if_block41 = /*musicbook*/ ctx[13] && create_if_block_76(ctx);
    	let if_block42 = /*corruptedspace*/ ctx[14] && create_if_block_75(ctx);
    	let if_block43 = /*oilbuddies*/ ctx[15] && create_if_block_74(ctx);
    	let if_block44 = /*litabok*/ ctx[16] && create_if_block_73(ctx);
    	let if_block45 = /*plastica*/ ctx[17] && create_if_block_72(ctx);
    	let if_block46 = /*familiarfaces*/ ctx[18] && create_if_block_71(ctx);
    	let if_block47 = /*likamar*/ ctx[19] && create_if_block_70(ctx);
    	let if_block48 = /*flora*/ ctx[23] && create_if_block_69(ctx);
    	let if_block49 = /*evublad*/ ctx[25] && create_if_block_68(ctx);
    	let if_block50 = /*frontscreen*/ ctx[1] && create_if_block_67(ctx);
    	let if_block51 = /*onourowntime*/ ctx[2] && create_if_block_66(ctx);
    	let if_block52 = /*green*/ ctx[3] && create_if_block_65(ctx);
    	let if_block53 = /*viv*/ ctx[4] && create_if_block_64(ctx);
    	let if_block54 = /*bread*/ ctx[22] && create_if_block_63(ctx);
    	let if_block55 = /*breadmag*/ ctx[24] && create_if_block_62(ctx);
    	let if_block56 = /*portfolioio*/ ctx[7] && create_if_block_61(ctx);
    	let if_block57 = /*typoposters*/ ctx[5] && create_if_block_60(ctx);
    	let if_block58 = /*beauimg*/ ctx[21] && create_if_block_59(ctx);
    	let if_block59 = /*secret*/ ctx[6] && create_if_block_58(ctx);
    	let if_block60 = /*sortedplastic*/ ctx[8] && create_if_block_57(ctx);
    	let if_block61 = /*oeb*/ ctx[20] && create_if_block_56(ctx);
    	let if_block62 = /*musicposters*/ ctx[9] && create_if_block_55(ctx);
    	let if_block63 = /*timatal*/ ctx[10] && create_if_block_54(ctx);
    	let if_block64 = /*tools*/ ctx[11] && create_if_block_53(ctx);
    	let if_block65 = /*trash*/ ctx[12] && create_if_block_52(ctx);
    	let if_block66 = /*musicbook*/ ctx[13] && create_if_block_51(ctx);
    	let if_block67 = /*corruptedspace*/ ctx[14] && create_if_block_50(ctx);
    	let if_block68 = /*oilbuddies*/ ctx[15] && create_if_block_49(ctx);
    	let if_block69 = /*litabok*/ ctx[16] && create_if_block_48(ctx);
    	let if_block70 = /*plastica*/ ctx[17] && create_if_block_47(ctx);
    	let if_block71 = /*familiarfaces*/ ctx[18] && create_if_block_46(ctx);
    	let if_block72 = /*likamar*/ ctx[19] && create_if_block_45(ctx);
    	let if_block73 = /*flora*/ ctx[23] && create_if_block_44(ctx);
    	let if_block74 = /*evublad*/ ctx[25] && create_if_block_43(ctx);
    	let if_block75 = /*frontscreen*/ ctx[1] && create_if_block_42(ctx);
    	let if_block76 = /*onourowntime*/ ctx[2] && create_if_block_41(ctx);
    	let if_block77 = /*viv*/ ctx[4] && create_if_block_40(ctx);
    	let if_block78 = /*typoposters*/ ctx[5] && create_if_block_39(ctx);
    	let if_block79 = /*secret*/ ctx[6] && create_if_block_38(ctx);
    	let if_block80 = /*tools*/ ctx[11] && create_if_block_37(ctx);
    	let if_block81 = /*timatal*/ ctx[10] && create_if_block_36(ctx);
    	let if_block82 = /*sortedplastic*/ ctx[8] && create_if_block_35(ctx);
    	let if_block83 = /*litabok*/ ctx[16] && create_if_block_34(ctx);
    	let if_block84 = /*oilbuddies*/ ctx[15] && create_if_block_33(ctx);
    	let if_block85 = /*trash*/ ctx[12] && create_if_block_32(ctx);
    	let if_block86 = /*familiarfaces*/ ctx[18] && create_if_block_31(ctx);
    	let if_block87 = /*musicbook*/ ctx[13] && create_if_block_30(ctx);
    	let if_block88 = /*plastica*/ ctx[17] && create_if_block_29(ctx);
    	let if_block89 = /*corruptedspace*/ ctx[14] && create_if_block_28(ctx);
    	let if_block90 = /*likamar*/ ctx[19] && create_if_block_27(ctx);
    	let if_block91 = /*green*/ ctx[3] && create_if_block_26(ctx);
    	let if_block92 = /*evublad*/ ctx[25] && create_if_block_25(ctx);
    	let if_block93 = /*onourowntime*/ ctx[2] && create_if_block_24(ctx);
    	let if_block94 = /*green*/ ctx[3] && create_if_block_23(ctx);
    	let if_block95 = /*viv*/ ctx[4] && create_if_block_22(ctx);
    	let if_block96 = /*portfolioio*/ ctx[7] && create_if_block_21(ctx);
    	let if_block97 = /*typoposters*/ ctx[5] && create_if_block_20(ctx);
    	let if_block98 = /*secret*/ ctx[6] && create_if_block_19(ctx);
    	let if_block99 = /*sortedplastic*/ ctx[8] && create_if_block_18(ctx);
    	let if_block100 = /*musicposters*/ ctx[9] && create_if_block_17(ctx);
    	let if_block101 = /*timatal*/ ctx[10] && create_if_block_16(ctx);
    	let if_block102 = /*tools*/ ctx[11] && create_if_block_15(ctx);
    	let if_block103 = /*trash*/ ctx[12] && create_if_block_14(ctx);
    	let if_block104 = /*musicbook*/ ctx[13] && create_if_block_13(ctx);
    	let if_block105 = /*corruptedspace*/ ctx[14] && create_if_block_12(ctx);
    	let if_block106 = /*oilbuddies*/ ctx[15] && create_if_block_11(ctx);
    	let if_block107 = /*litabok*/ ctx[16] && create_if_block_10(ctx);
    	let if_block108 = /*plastica*/ ctx[17] && create_if_block_9(ctx);
    	let if_block109 = /*familiarfaces*/ ctx[18] && create_if_block_8(ctx);
    	let if_block110 = /*likamar*/ ctx[19] && create_if_block_7(ctx);
    	let if_block111 = /*oeb*/ ctx[20] && create_if_block_6(ctx);
    	let if_block112 = /*beauimg*/ ctx[21] && create_if_block_5(ctx);
    	let if_block113 = /*bread*/ ctx[22] && create_if_block_4(ctx);
    	let if_block114 = /*flora*/ ctx[23] && create_if_block_3(ctx);
    	let if_block115 = /*breadmag*/ ctx[24] && create_if_block_2(ctx);
    	let if_block116 = /*evublad*/ ctx[25] && create_if_block_1(ctx);
    	let if_block117 = /*other*/ ctx[26] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			div0.textContent = "MENU";
    			t1 = space();
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			if (if_block2) if_block2.c();
    			t4 = space();
    			if (if_block3) if_block3.c();
    			t5 = space();
    			if (if_block4) if_block4.c();
    			t6 = space();
    			if (if_block5) if_block5.c();
    			t7 = space();
    			if (if_block6) if_block6.c();
    			t8 = space();
    			if (if_block7) if_block7.c();
    			t9 = space();
    			if (if_block8) if_block8.c();
    			t10 = space();
    			if (if_block9) if_block9.c();
    			t11 = space();
    			if (if_block10) if_block10.c();
    			t12 = space();
    			if (if_block11) if_block11.c();
    			t13 = space();
    			if (if_block12) if_block12.c();
    			t14 = space();
    			if (if_block13) if_block13.c();
    			t15 = space();
    			if (if_block14) if_block14.c();
    			t16 = space();
    			if (if_block15) if_block15.c();
    			t17 = space();
    			if (if_block16) if_block16.c();
    			t18 = space();
    			if (if_block17) if_block17.c();
    			t19 = space();
    			if (if_block18) if_block18.c();
    			t20 = space();
    			if (if_block19) if_block19.c();
    			t21 = space();
    			if (if_block20) if_block20.c();
    			t22 = space();
    			if (if_block21) if_block21.c();
    			t23 = space();
    			if (if_block22) if_block22.c();
    			t24 = space();
    			if (if_block23) if_block23.c();
    			t25 = space();
    			if (if_block24) if_block24.c();
    			t26 = space();
    			div2 = element("div");
    			span0 = element("span");
    			if (if_block25) if_block25.c();
    			t27 = space();
    			if (if_block26) if_block26.c();
    			t28 = space();
    			if (if_block27) if_block27.c();
    			t29 = space();
    			if (if_block28) if_block28.c();
    			t30 = space();
    			if (if_block29) if_block29.c();
    			t31 = space();
    			if (if_block30) if_block30.c();
    			t32 = space();
    			if (if_block31) if_block31.c();
    			t33 = space();
    			if (if_block32) if_block32.c();
    			t34 = space();
    			if (if_block33) if_block33.c();
    			t35 = space();
    			if (if_block34) if_block34.c();
    			t36 = space();
    			if (if_block35) if_block35.c();
    			t37 = space();
    			if (if_block36) if_block36.c();
    			t38 = space();
    			if (if_block37) if_block37.c();
    			t39 = space();
    			if (if_block38) if_block38.c();
    			t40 = space();
    			if (if_block39) if_block39.c();
    			t41 = space();
    			if (if_block40) if_block40.c();
    			t42 = space();
    			if (if_block41) if_block41.c();
    			t43 = space();
    			if (if_block42) if_block42.c();
    			t44 = space();
    			if (if_block43) if_block43.c();
    			t45 = space();
    			if (if_block44) if_block44.c();
    			t46 = space();
    			if (if_block45) if_block45.c();
    			t47 = space();
    			if (if_block46) if_block46.c();
    			t48 = space();
    			if (if_block47) if_block47.c();
    			t49 = space();
    			if (if_block48) if_block48.c();
    			t50 = space();
    			if (if_block49) if_block49.c();
    			t51 = space();
    			div3 = element("div");
    			if (if_block50) if_block50.c();
    			t52 = space();
    			if (if_block51) if_block51.c();
    			t53 = space();
    			if (if_block52) if_block52.c();
    			t54 = space();
    			if (if_block53) if_block53.c();
    			t55 = space();
    			if (if_block54) if_block54.c();
    			t56 = space();
    			if (if_block55) if_block55.c();
    			t57 = space();
    			if (if_block56) if_block56.c();
    			t58 = space();
    			if (if_block57) if_block57.c();
    			t59 = space();
    			if (if_block58) if_block58.c();
    			t60 = space();
    			if (if_block59) if_block59.c();
    			t61 = space();
    			if (if_block60) if_block60.c();
    			t62 = space();
    			if (if_block61) if_block61.c();
    			t63 = space();
    			if (if_block62) if_block62.c();
    			t64 = space();
    			if (if_block63) if_block63.c();
    			t65 = space();
    			if (if_block64) if_block64.c();
    			t66 = space();
    			if (if_block65) if_block65.c();
    			t67 = space();
    			if (if_block66) if_block66.c();
    			t68 = space();
    			if (if_block67) if_block67.c();
    			t69 = space();
    			if (if_block68) if_block68.c();
    			t70 = space();
    			if (if_block69) if_block69.c();
    			t71 = space();
    			if (if_block70) if_block70.c();
    			t72 = space();
    			if (if_block71) if_block71.c();
    			t73 = space();
    			if (if_block72) if_block72.c();
    			t74 = space();
    			if (if_block73) if_block73.c();
    			t75 = space();
    			if (if_block74) if_block74.c();
    			t76 = space();
    			div4 = element("div");
    			span1 = element("span");
    			if (if_block75) if_block75.c();
    			t77 = space();
    			if (if_block76) if_block76.c();
    			t78 = space();
    			if (if_block77) if_block77.c();
    			t79 = space();
    			if (if_block78) if_block78.c();
    			t80 = space();
    			if (if_block79) if_block79.c();
    			t81 = space();
    			if (if_block80) if_block80.c();
    			t82 = space();
    			if (if_block81) if_block81.c();
    			t83 = space();
    			if (if_block82) if_block82.c();
    			t84 = space();
    			if (if_block83) if_block83.c();
    			t85 = space();
    			if (if_block84) if_block84.c();
    			t86 = space();
    			if (if_block85) if_block85.c();
    			t87 = space();
    			if (if_block86) if_block86.c();
    			t88 = space();
    			if (if_block87) if_block87.c();
    			t89 = space();
    			if (if_block88) if_block88.c();
    			t90 = space();
    			if (if_block89) if_block89.c();
    			t91 = space();
    			if (if_block90) if_block90.c();
    			t92 = space();
    			if (if_block91) if_block91.c();
    			t93 = space();
    			if (if_block92) if_block92.c();
    			t94 = space();
    			if (if_block93) if_block93.c();
    			t95 = space();
    			if (if_block94) if_block94.c();
    			t96 = space();
    			if (if_block95) if_block95.c();
    			t97 = space();
    			if (if_block96) if_block96.c();
    			t98 = space();
    			if (if_block97) if_block97.c();
    			t99 = space();
    			if (if_block98) if_block98.c();
    			t100 = space();
    			if (if_block99) if_block99.c();
    			t101 = space();
    			if (if_block100) if_block100.c();
    			t102 = space();
    			if (if_block101) if_block101.c();
    			t103 = space();
    			if (if_block102) if_block102.c();
    			t104 = space();
    			if (if_block103) if_block103.c();
    			t105 = space();
    			if (if_block104) if_block104.c();
    			t106 = space();
    			if (if_block105) if_block105.c();
    			t107 = space();
    			if (if_block106) if_block106.c();
    			t108 = space();
    			if (if_block107) if_block107.c();
    			t109 = space();
    			if (if_block108) if_block108.c();
    			t110 = space();
    			if (if_block109) if_block109.c();
    			t111 = space();
    			if (if_block110) if_block110.c();
    			t112 = space();
    			if (if_block111) if_block111.c();
    			t113 = space();
    			if (if_block112) if_block112.c();
    			t114 = space();
    			if (if_block113) if_block113.c();
    			t115 = space();
    			if (if_block114) if_block114.c();
    			t116 = space();
    			if (if_block115) if_block115.c();
    			t117 = space();
    			if (if_block116) if_block116.c();
    			t118 = space();
    			div7 = element("div");
    			div6 = element("div");
    			img0 = element("img");
    			br0 = element("br");
    			br1 = element("br");
    			t119 = text("\n      BERGLIND BRÁ");
    			br2 = element("br");
    			br3 = element("br");
    			t120 = space();
    			i0 = element("i");
    			i0.textContent = "Education";
    			br4 = element("br");
    			t122 = text("\n      Sjónlist 2015, Myndlistaskólinn í Reykjavík");
    			br5 = element("br");
    			t123 = text("\n      Graphic Design BA 2020, The Royal Academy of Art, The Hague\n      ");
    			br6 = element("br");
    			br7 = element("br");
    			t124 = space();
    			span2 = element("span");
    			i1 = element("i");
    			i1.textContent = "Work experience";
    			br8 = element("br");
    			t126 = text("\n      Web building / graphic design for Flóra útgáfa");
    			br9 = element("br");
    			t127 = text("\n      Internship at Somalgors74 / Curdin Tones");
    			br10 = element("br");
    			t128 = text("\n      Portfolio website for photographer Io Alexa Sivertsen");
    			br11 = element("br");
    			br12 = element("br");
    			t129 = space();
    			i2 = element("i");
    			i2.textContent = "Contact";
    			br13 = element("br");
    			t131 = text("\n      berglindbra28@gmail.com");
    			br14 = element("br");
    			t132 = space();
    			span3 = element("span");
    			br15 = element("br");
    			br16 = element("br");
    			t133 = text("**MOBILE VERSION IS UNDER CONSTRUCTION**");
    			t134 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div8 = element("div");
    			div8.textContent = "Work";
    			t136 = space();
    			div9 = element("div");
    			t137 = space();
    			br17 = element("br");
    			br18 = element("br");
    			t138 = space();
    			img1 = element("img");
    			t139 = space();
    			img2 = element("img");
    			t140 = space();
    			img3 = element("img");
    			t141 = space();
    			img4 = element("img");
    			t142 = space();
    			img5 = element("img");
    			t143 = space();
    			img6 = element("img");
    			t144 = space();
    			img7 = element("img");
    			t145 = space();
    			img8 = element("img");
    			t146 = space();
    			img9 = element("img");
    			t147 = space();
    			img10 = element("img");
    			t148 = space();
    			img11 = element("img");
    			t149 = space();
    			img12 = element("img");
    			t150 = space();
    			img13 = element("img");
    			t151 = space();
    			img14 = element("img");
    			t152 = space();
    			img15 = element("img");
    			t153 = space();
    			img16 = element("img");
    			t154 = space();
    			img17 = element("img");
    			t155 = space();
    			img18 = element("img");
    			t156 = space();
    			img19 = element("img");
    			t157 = space();
    			img20 = element("img");
    			t158 = space();
    			img21 = element("img");
    			t159 = space();
    			img22 = element("img");
    			t160 = space();
    			img23 = element("img");
    			t161 = space();
    			img24 = element("img");
    			t162 = space();
    			img25 = element("img");
    			t163 = space();
    			if (if_block117) if_block117.c();
    			attr_dev(div0, "class", "menu");
    			add_location(div0, file$o, 111, 2, 14031);
    			attr_dev(div1, "class", "date mainscreen-main");
    			add_location(div1, file$o, 122, 2, 14337);
    			attr_dev(span0, "class", "subtitles-text");
    			add_location(span0, file$o, 150, 50, 15316);
    			attr_dev(div2, "class", "subtitlesDate mainscreen-subtitles");
    			add_location(div2, file$o, 150, 2, 15268);
    			attr_dev(div3, "class", "name mainscreen-main");
    			add_location(div3, file$o, 178, 2, 16180);
    			attr_dev(span1, "class", "subtitles-text");
    			add_location(span1, file$o, 206, 4, 17695);
    			attr_dev(div4, "class", "subtitlesName mainscreen-subtitles");
    			add_location(div4, file$o, 205, 2, 17642);
    			attr_dev(div5, "id", "Screen");
    			attr_dev(div5, "class", "containerMiddleScroll svelte-1eguo3s");
    			toggle_class(div5, "expand", /*expand*/ ctx[0]);
    			add_location(div5, file$o, 108, 0, 13880);
    			attr_dev(img0, "class", "logoBio");
    			attr_dev(img0, "alt", "mynd");
    			if (img0.src !== (img0_src_value = "igms/icons/BBJsmall2.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$o, 265, 6, 22073);
    			add_location(br0, file$o, 265, 69, 22136);
    			add_location(br1, file$o, 265, 73, 22140);
    			add_location(br2, file$o, 266, 18, 22163);
    			add_location(br3, file$o, 266, 22, 22167);
    			add_location(i0, file$o, 267, 6, 22178);
    			add_location(br4, file$o, 267, 22, 22194);
    			add_location(br5, file$o, 268, 49, 22248);
    			add_location(br6, file$o, 270, 6, 22325);
    			add_location(br7, file$o, 270, 10, 22329);
    			add_location(i1, file$o, 271, 34, 22368);
    			add_location(br8, file$o, 271, 56, 22390);
    			add_location(br9, file$o, 272, 52, 22447);
    			add_location(br10, file$o, 273, 46, 22498);
    			add_location(br11, file$o, 274, 59, 22562);
    			add_location(br12, file$o, 274, 63, 22566);
    			attr_dev(span2, "class", "out-on-mobile");
    			add_location(span2, file$o, 271, 6, 22340);
    			add_location(i2, file$o, 278, 6, 22649);
    			add_location(br13, file$o, 278, 20, 22663);
    			add_location(br14, file$o, 279, 29, 22697);
    			add_location(br15, file$o, 281, 76, 22867);
    			add_location(br16, file$o, 281, 80, 22871);
    			attr_dev(span3, "class", "out-on-desktop construction");
    			set_style(span3, "text-align", "center");
    			add_location(span3, file$o, 281, 6, 22797);
    			attr_dev(div6, "class", "biography-text");
    			add_location(div6, file$o, 264, 2, 22038);
    			attr_dev(div7, "class", "biography");
    			add_location(div7, file$o, 262, 0, 22009);
    			attr_dev(div8, "class", "caption");
    			add_location(div8, file$o, 291, 4, 23001);
    			attr_dev(div9, "class", "out-on-desktop");
    			add_location(div9, file$o, 294, 4, 23049);
    			add_location(br17, file$o, 295, 4, 23088);
    			add_location(br18, file$o, 295, 8, 23092);
    			attr_dev(img1, "class", "smallPic");
    			attr_dev(img1, "alt", "mynd");
    			if (img1.src !== (img1_src_value = "igms/flora/small.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$o, 298, 4, 23111);
    			attr_dev(img2, "class", "smallPic");
    			attr_dev(img2, "alt", "mynd");
    			if (img2.src !== (img2_src_value = "igms/onourowntime/small.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$o, 299, 4, 23235);
    			attr_dev(img3, "class", "smallPic");
    			attr_dev(img3, "alt", "mynd");
    			if (img3.src !== (img3_src_value = "igms/thesis/small.jpg")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$o, 300, 4, 23373);
    			attr_dev(img4, "class", "smallPic");
    			attr_dev(img4, "alt", "mynd");
    			if (img4.src !== (img4_src_value = "igms/viv/small.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$o, 301, 4, 23498);
    			attr_dev(img5, "class", "smallPic");
    			attr_dev(img5, "alt", "mynd");
    			if (img5.src !== (img5_src_value = "igms/bread/small.jpg")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$o, 302, 4, 23618);
    			attr_dev(img6, "class", "smallPic");
    			attr_dev(img6, "alt", "mynd");
    			if (img6.src !== (img6_src_value = "igms/bread/breadmag.jpg")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$o, 303, 4, 23742);
    			attr_dev(img7, "class", "smallPic");
    			attr_dev(img7, "alt", "mynd");
    			if (img7.src !== (img7_src_value = "igms/io/small.png")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$o, 304, 4, 23872);
    			attr_dev(img8, "class", "smallPic");
    			attr_dev(img8, "alt", "mynd");
    			if (img8.src !== (img8_src_value = "igms/beauimg/small.jpg")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file$o, 305, 4, 23999);
    			attr_dev(img9, "class", "smallPic");
    			attr_dev(img9, "alt", "mynd");
    			if (img9.src !== (img9_src_value = "igms/typoPosters/3.jpg")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file$o, 306, 4, 24127);
    			attr_dev(img10, "class", "smallPic");
    			attr_dev(img10, "alt", "mynd");
    			if (img10.src !== (img10_src_value = "igms/oeb/small.png")) attr_dev(img10, "src", img10_src_value);
    			add_location(img10, file$o, 308, 4, 24392);
    			attr_dev(img11, "class", "smallPic");
    			attr_dev(img11, "alt", "mynd");
    			if (img11.src !== (img11_src_value = "igms/sortedPlastic/small.png")) attr_dev(img11, "src", img11_src_value);
    			add_location(img11, file$o, 309, 4, 24512);
    			attr_dev(img12, "class", "smallPic");
    			attr_dev(img12, "alt", "mynd");
    			if (img12.src !== (img12_src_value = "igms/musicPosters/small.jpg")) attr_dev(img12, "src", img12_src_value);
    			add_location(img12, file$o, 310, 4, 24652);
    			attr_dev(img13, "class", "smallPic");
    			attr_dev(img13, "alt", "mynd");
    			if (img13.src !== (img13_src_value = "igms/timatal/small.png")) attr_dev(img13, "src", img13_src_value);
    			add_location(img13, file$o, 311, 4, 24790);
    			attr_dev(img14, "class", "smallPic");
    			attr_dev(img14, "alt", "mynd");
    			if (img14.src !== (img14_src_value = "igms/tools/tools.png")) attr_dev(img14, "src", img14_src_value);
    			add_location(img14, file$o, 312, 4, 24918);
    			attr_dev(img15, "class", "smallPic");
    			attr_dev(img15, "alt", "mynd");
    			if (img15.src !== (img15_src_value = "igms/somalgors74/small.jpg")) attr_dev(img15, "src", img15_src_value);
    			add_location(img15, file$o, 314, 4, 25112);
    			attr_dev(img16, "class", "smallPic");
    			attr_dev(img16, "alt", "mynd");
    			if (img16.src !== (img16_src_value = "igms/typedesign/svhv35.jpg")) attr_dev(img16, "src", img16_src_value);
    			add_location(img16, file$o, 315, 1, 25180);
    			attr_dev(img17, "class", "smallPic");
    			attr_dev(img17, "alt", "mynd");
    			if (img17.src !== (img17_src_value = "igms/secret/small.png")) attr_dev(img17, "src", img17_src_value);
    			add_location(img17, file$o, 317, 1, 25384);
    			attr_dev(img18, "class", "smallPic larger");
    			attr_dev(img18, "alt", "mynd");
    			if (img18.src !== (img18_src_value = "igms/musicBook/4.png")) attr_dev(img18, "src", img18_src_value);
    			add_location(img18, file$o, 318, 1, 25507);
    			attr_dev(img19, "class", "smallPic");
    			attr_dev(img19, "alt", "mynd");
    			if (img19.src !== (img19_src_value = "igms/corruptedspace/smaller.jpg")) attr_dev(img19, "src", img19_src_value);
    			add_location(img19, file$o, 319, 1, 25639);
    			attr_dev(img20, "class", "smallPic");
    			attr_dev(img20, "alt", "mynd");
    			if (img20.src !== (img20_src_value = "igms/evublad/evublad-spreads0.jpg")) attr_dev(img20, "src", img20_src_value);
    			add_location(img20, file$o, 320, 2, 25781);
    			attr_dev(img21, "class", "smallPic");
    			attr_dev(img21, "alt", "mynd");
    			if (img21.src !== (img21_src_value = "igms/familiarfaces/small.jpg")) attr_dev(img21, "src", img21_src_value);
    			add_location(img21, file$o, 321, 1, 25917);
    			attr_dev(img22, "class", "smallPic");
    			attr_dev(img22, "alt", "mynd");
    			set_style(img22, "max-width", "250px");
    			if (img22.src !== (img22_src_value = "igms/litabok/small.png")) attr_dev(img22, "src", img22_src_value);
    			add_location(img22, file$o, 322, 4, 26057);
    			attr_dev(img23, "class", "smallPic");
    			attr_dev(img23, "alt", "mynd");
    			if (img23.src !== (img23_src_value = "igms/trash/small.png")) attr_dev(img23, "src", img23_src_value);
    			add_location(img23, file$o, 323, 1, 26208);
    			attr_dev(img24, "class", "smallPic");
    			attr_dev(img24, "alt", "mynd");
    			if (img24.src !== (img24_src_value = "igms/plastica/small2.png")) attr_dev(img24, "src", img24_src_value);
    			add_location(img24, file$o, 330, 4, 26649);
    			attr_dev(img25, "class", "smallPic");
    			attr_dev(img25, "alt", "mynd");
    			set_style(img25, "border-radius", "50px");
    			if (img25.src !== (img25_src_value = "igms/oilbuddies/small.png")) attr_dev(img25, "src", img25_src_value);
    			add_location(img25, file$o, 332, 4, 26782);
    			attr_dev(div10, "class", "wrapper back");
    			add_location(div10, file$o, 290, 2, 22970);
    			attr_dev(div11, "class", "container");
    			add_location(div11, file$o, 288, 0, 22943);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div5, t1);
    			append_dev(div5, div1);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t2);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t3);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(div1, t4);
    			if (if_block3) if_block3.m(div1, null);
    			append_dev(div1, t5);
    			if (if_block4) if_block4.m(div1, null);
    			append_dev(div1, t6);
    			if (if_block5) if_block5.m(div1, null);
    			append_dev(div1, t7);
    			if (if_block6) if_block6.m(div1, null);
    			append_dev(div1, t8);
    			if (if_block7) if_block7.m(div1, null);
    			append_dev(div1, t9);
    			if (if_block8) if_block8.m(div1, null);
    			append_dev(div1, t10);
    			if (if_block9) if_block9.m(div1, null);
    			append_dev(div1, t11);
    			if (if_block10) if_block10.m(div1, null);
    			append_dev(div1, t12);
    			if (if_block11) if_block11.m(div1, null);
    			append_dev(div1, t13);
    			if (if_block12) if_block12.m(div1, null);
    			append_dev(div1, t14);
    			if (if_block13) if_block13.m(div1, null);
    			append_dev(div1, t15);
    			if (if_block14) if_block14.m(div1, null);
    			append_dev(div1, t16);
    			if (if_block15) if_block15.m(div1, null);
    			append_dev(div1, t17);
    			if (if_block16) if_block16.m(div1, null);
    			append_dev(div1, t18);
    			if (if_block17) if_block17.m(div1, null);
    			append_dev(div1, t19);
    			if (if_block18) if_block18.m(div1, null);
    			append_dev(div1, t20);
    			if (if_block19) if_block19.m(div1, null);
    			append_dev(div1, t21);
    			if (if_block20) if_block20.m(div1, null);
    			append_dev(div1, t22);
    			if (if_block21) if_block21.m(div1, null);
    			append_dev(div1, t23);
    			if (if_block22) if_block22.m(div1, null);
    			append_dev(div1, t24);
    			if (if_block23) if_block23.m(div1, null);
    			append_dev(div1, t25);
    			if (if_block24) if_block24.m(div1, null);
    			append_dev(div5, t26);
    			append_dev(div5, div2);
    			append_dev(div2, span0);
    			if (if_block25) if_block25.m(span0, null);
    			append_dev(span0, t27);
    			if (if_block26) if_block26.m(span0, null);
    			append_dev(span0, t28);
    			if (if_block27) if_block27.m(span0, null);
    			append_dev(span0, t29);
    			if (if_block28) if_block28.m(span0, null);
    			append_dev(span0, t30);
    			if (if_block29) if_block29.m(span0, null);
    			append_dev(span0, t31);
    			if (if_block30) if_block30.m(span0, null);
    			append_dev(span0, t32);
    			if (if_block31) if_block31.m(span0, null);
    			append_dev(span0, t33);
    			if (if_block32) if_block32.m(span0, null);
    			append_dev(span0, t34);
    			if (if_block33) if_block33.m(span0, null);
    			append_dev(span0, t35);
    			if (if_block34) if_block34.m(span0, null);
    			append_dev(span0, t36);
    			if (if_block35) if_block35.m(span0, null);
    			append_dev(span0, t37);
    			if (if_block36) if_block36.m(span0, null);
    			append_dev(span0, t38);
    			if (if_block37) if_block37.m(span0, null);
    			append_dev(span0, t39);
    			if (if_block38) if_block38.m(span0, null);
    			append_dev(span0, t40);
    			if (if_block39) if_block39.m(span0, null);
    			append_dev(span0, t41);
    			if (if_block40) if_block40.m(span0, null);
    			append_dev(span0, t42);
    			if (if_block41) if_block41.m(span0, null);
    			append_dev(span0, t43);
    			if (if_block42) if_block42.m(span0, null);
    			append_dev(span0, t44);
    			if (if_block43) if_block43.m(span0, null);
    			append_dev(span0, t45);
    			if (if_block44) if_block44.m(span0, null);
    			append_dev(span0, t46);
    			if (if_block45) if_block45.m(span0, null);
    			append_dev(span0, t47);
    			if (if_block46) if_block46.m(span0, null);
    			append_dev(span0, t48);
    			if (if_block47) if_block47.m(span0, null);
    			append_dev(span0, t49);
    			if (if_block48) if_block48.m(span0, null);
    			append_dev(span0, t50);
    			if (if_block49) if_block49.m(span0, null);
    			append_dev(div5, t51);
    			append_dev(div5, div3);
    			if (if_block50) if_block50.m(div3, null);
    			append_dev(div3, t52);
    			if (if_block51) if_block51.m(div3, null);
    			append_dev(div3, t53);
    			if (if_block52) if_block52.m(div3, null);
    			append_dev(div3, t54);
    			if (if_block53) if_block53.m(div3, null);
    			append_dev(div3, t55);
    			if (if_block54) if_block54.m(div3, null);
    			append_dev(div3, t56);
    			if (if_block55) if_block55.m(div3, null);
    			append_dev(div3, t57);
    			if (if_block56) if_block56.m(div3, null);
    			append_dev(div3, t58);
    			if (if_block57) if_block57.m(div3, null);
    			append_dev(div3, t59);
    			if (if_block58) if_block58.m(div3, null);
    			append_dev(div3, t60);
    			if (if_block59) if_block59.m(div3, null);
    			append_dev(div3, t61);
    			if (if_block60) if_block60.m(div3, null);
    			append_dev(div3, t62);
    			if (if_block61) if_block61.m(div3, null);
    			append_dev(div3, t63);
    			if (if_block62) if_block62.m(div3, null);
    			append_dev(div3, t64);
    			if (if_block63) if_block63.m(div3, null);
    			append_dev(div3, t65);
    			if (if_block64) if_block64.m(div3, null);
    			append_dev(div3, t66);
    			if (if_block65) if_block65.m(div3, null);
    			append_dev(div3, t67);
    			if (if_block66) if_block66.m(div3, null);
    			append_dev(div3, t68);
    			if (if_block67) if_block67.m(div3, null);
    			append_dev(div3, t69);
    			if (if_block68) if_block68.m(div3, null);
    			append_dev(div3, t70);
    			if (if_block69) if_block69.m(div3, null);
    			append_dev(div3, t71);
    			if (if_block70) if_block70.m(div3, null);
    			append_dev(div3, t72);
    			if (if_block71) if_block71.m(div3, null);
    			append_dev(div3, t73);
    			if (if_block72) if_block72.m(div3, null);
    			append_dev(div3, t74);
    			if (if_block73) if_block73.m(div3, null);
    			append_dev(div3, t75);
    			if (if_block74) if_block74.m(div3, null);
    			append_dev(div5, t76);
    			append_dev(div5, div4);
    			append_dev(div4, span1);
    			if (if_block75) if_block75.m(span1, null);
    			append_dev(span1, t77);
    			if (if_block76) if_block76.m(span1, null);
    			append_dev(span1, t78);
    			if (if_block77) if_block77.m(span1, null);
    			append_dev(span1, t79);
    			if (if_block78) if_block78.m(span1, null);
    			append_dev(span1, t80);
    			if (if_block79) if_block79.m(span1, null);
    			append_dev(span1, t81);
    			if (if_block80) if_block80.m(span1, null);
    			append_dev(span1, t82);
    			if (if_block81) if_block81.m(span1, null);
    			append_dev(span1, t83);
    			if (if_block82) if_block82.m(span1, null);
    			append_dev(span1, t84);
    			if (if_block83) if_block83.m(span1, null);
    			append_dev(span1, t85);
    			if (if_block84) if_block84.m(span1, null);
    			append_dev(span1, t86);
    			if (if_block85) if_block85.m(span1, null);
    			append_dev(span1, t87);
    			if (if_block86) if_block86.m(span1, null);
    			append_dev(span1, t88);
    			if (if_block87) if_block87.m(span1, null);
    			append_dev(span1, t89);
    			if (if_block88) if_block88.m(span1, null);
    			append_dev(span1, t90);
    			if (if_block89) if_block89.m(span1, null);
    			append_dev(span1, t91);
    			if (if_block90) if_block90.m(span1, null);
    			append_dev(span1, t92);
    			if (if_block91) if_block91.m(span1, null);
    			append_dev(span1, t93);
    			if (if_block92) if_block92.m(span1, null);
    			append_dev(div5, t94);
    			if (if_block93) if_block93.m(div5, null);
    			append_dev(div5, t95);
    			if (if_block94) if_block94.m(div5, null);
    			append_dev(div5, t96);
    			if (if_block95) if_block95.m(div5, null);
    			append_dev(div5, t97);
    			if (if_block96) if_block96.m(div5, null);
    			append_dev(div5, t98);
    			if (if_block97) if_block97.m(div5, null);
    			append_dev(div5, t99);
    			if (if_block98) if_block98.m(div5, null);
    			append_dev(div5, t100);
    			if (if_block99) if_block99.m(div5, null);
    			append_dev(div5, t101);
    			if (if_block100) if_block100.m(div5, null);
    			append_dev(div5, t102);
    			if (if_block101) if_block101.m(div5, null);
    			append_dev(div5, t103);
    			if (if_block102) if_block102.m(div5, null);
    			append_dev(div5, t104);
    			if (if_block103) if_block103.m(div5, null);
    			append_dev(div5, t105);
    			if (if_block104) if_block104.m(div5, null);
    			append_dev(div5, t106);
    			if (if_block105) if_block105.m(div5, null);
    			append_dev(div5, t107);
    			if (if_block106) if_block106.m(div5, null);
    			append_dev(div5, t108);
    			if (if_block107) if_block107.m(div5, null);
    			append_dev(div5, t109);
    			if (if_block108) if_block108.m(div5, null);
    			append_dev(div5, t110);
    			if (if_block109) if_block109.m(div5, null);
    			append_dev(div5, t111);
    			if (if_block110) if_block110.m(div5, null);
    			append_dev(div5, t112);
    			if (if_block111) if_block111.m(div5, null);
    			append_dev(div5, t113);
    			if (if_block112) if_block112.m(div5, null);
    			append_dev(div5, t114);
    			if (if_block113) if_block113.m(div5, null);
    			append_dev(div5, t115);
    			if (if_block114) if_block114.m(div5, null);
    			append_dev(div5, t116);
    			if (if_block115) if_block115.m(div5, null);
    			append_dev(div5, t117);
    			if (if_block116) if_block116.m(div5, null);
    			insert_dev(target, t118, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, img0);
    			append_dev(div6, br0);
    			append_dev(div6, br1);
    			append_dev(div6, t119);
    			append_dev(div6, br2);
    			append_dev(div6, br3);
    			append_dev(div6, t120);
    			append_dev(div6, i0);
    			append_dev(div6, br4);
    			append_dev(div6, t122);
    			append_dev(div6, br5);
    			append_dev(div6, t123);
    			append_dev(div6, br6);
    			append_dev(div6, br7);
    			append_dev(div6, t124);
    			append_dev(div6, span2);
    			append_dev(span2, i1);
    			append_dev(span2, br8);
    			append_dev(span2, t126);
    			append_dev(span2, br9);
    			append_dev(span2, t127);
    			append_dev(span2, br10);
    			append_dev(span2, t128);
    			append_dev(span2, br11);
    			append_dev(span2, br12);
    			append_dev(div6, t129);
    			append_dev(div6, i2);
    			append_dev(div6, br13);
    			append_dev(div6, t131);
    			append_dev(div6, br14);
    			append_dev(div6, t132);
    			append_dev(div6, span3);
    			append_dev(span3, br15);
    			append_dev(span3, br16);
    			append_dev(span3, t133);
    			insert_dev(target, t134, anchor);
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div10);
    			append_dev(div10, div8);
    			append_dev(div10, t136);
    			append_dev(div10, div9);
    			append_dev(div10, t137);
    			append_dev(div10, br17);
    			append_dev(div10, br18);
    			append_dev(div10, t138);
    			append_dev(div10, img1);
    			append_dev(div10, t139);
    			append_dev(div10, img2);
    			append_dev(div10, t140);
    			append_dev(div10, img3);
    			append_dev(div10, t141);
    			append_dev(div10, img4);
    			append_dev(div10, t142);
    			append_dev(div10, img5);
    			append_dev(div10, t143);
    			append_dev(div10, img6);
    			append_dev(div10, t144);
    			append_dev(div10, img7);
    			append_dev(div10, t145);
    			append_dev(div10, img8);
    			append_dev(div10, t146);
    			append_dev(div10, img9);
    			append_dev(div10, t147);
    			append_dev(div10, img10);
    			append_dev(div10, t148);
    			append_dev(div10, img11);
    			append_dev(div10, t149);
    			append_dev(div10, img12);
    			append_dev(div10, t150);
    			append_dev(div10, img13);
    			append_dev(div10, t151);
    			append_dev(div10, img14);
    			append_dev(div10, t152);
    			append_dev(div10, img15);
    			append_dev(div10, t153);
    			append_dev(div10, img16);
    			append_dev(div10, t154);
    			append_dev(div10, img17);
    			append_dev(div10, t155);
    			append_dev(div10, img18);
    			append_dev(div10, t156);
    			append_dev(div10, img19);
    			append_dev(div10, t157);
    			append_dev(div10, img20);
    			append_dev(div10, t158);
    			append_dev(div10, img21);
    			append_dev(div10, t159);
    			append_dev(div10, img22);
    			append_dev(div10, t160);
    			append_dev(div10, img23);
    			append_dev(div10, t161);
    			append_dev(div10, img24);
    			append_dev(div10, t162);
    			append_dev(div10, img25);
    			append_dev(div10, t163);
    			if (if_block117) if_block117.m(div10, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*click_handler*/ ctx[51], false, false, false),
    					listen_dev(img1, "click", /*toggleflora*/ ctx[48], false, false, false),
    					listen_dev(img1, "click", /*click_handler_1*/ ctx[52], false, false, false),
    					listen_dev(img2, "click", /*toggleonourowntime*/ ctx[27], false, false, false),
    					listen_dev(img2, "click", /*click_handler_2*/ ctx[53], false, false, false),
    					listen_dev(img3, "click", /*togglegreen*/ ctx[28], false, false, false),
    					listen_dev(img3, "click", /*click_handler_3*/ ctx[54], false, false, false),
    					listen_dev(img4, "click", /*toggleviv*/ ctx[29], false, false, false),
    					listen_dev(img4, "click", /*click_handler_4*/ ctx[55], false, false, false),
    					listen_dev(img5, "click", /*togglebread*/ ctx[47], false, false, false),
    					listen_dev(img5, "click", /*click_handler_5*/ ctx[56], false, false, false),
    					listen_dev(img6, "click", /*togglebreadmag*/ ctx[49], false, false, false),
    					listen_dev(img6, "click", /*click_handler_6*/ ctx[57], false, false, false),
    					listen_dev(img7, "click", /*toggleportfolioio*/ ctx[30], false, false, false),
    					listen_dev(img7, "click", /*click_handler_7*/ ctx[58], false, false, false),
    					listen_dev(img8, "click", /*togglebeauimg*/ ctx[46], false, false, false),
    					listen_dev(img8, "click", /*click_handler_8*/ ctx[59], false, false, false),
    					listen_dev(img9, "click", /*toggletypoposters*/ ctx[31], false, false, false),
    					listen_dev(img9, "click", /*click_handler_9*/ ctx[60], false, false, false),
    					listen_dev(img10, "click", /*toggleoeb*/ ctx[45], false, false, false),
    					listen_dev(img10, "click", /*click_handler_10*/ ctx[61], false, false, false),
    					listen_dev(img11, "click", /*togglesortedplastic*/ ctx[33], false, false, false),
    					listen_dev(img11, "click", /*click_handler_11*/ ctx[62], false, false, false),
    					listen_dev(img12, "click", /*togglemusicposters*/ ctx[34], false, false, false),
    					listen_dev(img12, "click", /*click_handler_12*/ ctx[63], false, false, false),
    					listen_dev(img13, "click", /*toggletimatal*/ ctx[35], false, false, false),
    					listen_dev(img13, "click", /*click_handler_13*/ ctx[64], false, false, false),
    					listen_dev(img14, "click", /*toggletools*/ ctx[36], false, false, false),
    					listen_dev(img14, "click", /*click_handler_14*/ ctx[65], false, false, false),
    					listen_dev(img16, "click", /*togglelikamar*/ ctx[44], false, false, false),
    					listen_dev(img16, "click", /*click_handler_15*/ ctx[66], false, false, false),
    					listen_dev(img17, "click", /*togglesecret*/ ctx[32], false, false, false),
    					listen_dev(img17, "click", /*click_handler_16*/ ctx[67], false, false, false),
    					listen_dev(img18, "click", /*togglemusicbook*/ ctx[38], false, false, false),
    					listen_dev(img18, "click", /*click_handler_17*/ ctx[68], false, false, false),
    					listen_dev(img19, "click", /*togglecorruptedspace*/ ctx[39], false, false, false),
    					listen_dev(img19, "click", /*click_handler_18*/ ctx[69], false, false, false),
    					listen_dev(img20, "click", /*toggleevublad*/ ctx[50], false, false, false),
    					listen_dev(img20, "click", /*click_handler_19*/ ctx[70], false, false, false),
    					listen_dev(img21, "click", /*togglefamiliarfaces*/ ctx[41], false, false, false),
    					listen_dev(img21, "click", /*click_handler_20*/ ctx[71], false, false, false),
    					listen_dev(img22, "click", /*togglelitabok*/ ctx[42], false, false, false),
    					listen_dev(img22, "click", /*click_handler_21*/ ctx[72], false, false, false),
    					listen_dev(img23, "click", /*toggletrash*/ ctx[43], false, false, false),
    					listen_dev(img23, "click", /*click_handler_22*/ ctx[73], false, false, false),
    					listen_dev(img24, "click", /*toggleplastica*/ ctx[37], false, false, false),
    					listen_dev(img24, "click", /*click_handler_23*/ ctx[74], false, false, false),
    					listen_dev(img25, "click", /*toggleoilbuddies*/ ctx[40], false, false, false),
    					listen_dev(img25, "click", /*click_handler_24*/ ctx[75], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*frontscreen*/ ctx[1]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_117(ctx);
    					if_block0.c();
    					if_block0.m(div1, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*onourowntime*/ ctx[2]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_116(ctx);
    					if_block1.c();
    					if_block1.m(div1, t3);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*green*/ ctx[3]) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_115(ctx);
    					if_block2.c();
    					if_block2.m(div1, t4);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*viv*/ ctx[4]) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_114(ctx);
    					if_block3.c();
    					if_block3.m(div1, t5);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*portfolioio*/ ctx[7]) {
    				if (if_block4) ; else {
    					if_block4 = create_if_block_113(ctx);
    					if_block4.c();
    					if_block4.m(div1, t6);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*typoposters*/ ctx[5]) {
    				if (if_block5) ; else {
    					if_block5 = create_if_block_112(ctx);
    					if_block5.c();
    					if_block5.m(div1, t7);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (/*beauimg*/ ctx[21]) {
    				if (if_block6) ; else {
    					if_block6 = create_if_block_111(ctx);
    					if_block6.c();
    					if_block6.m(div1, t8);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}

    			if (/*secret*/ ctx[6]) {
    				if (if_block7) ; else {
    					if_block7 = create_if_block_110(ctx);
    					if_block7.c();
    					if_block7.m(div1, t9);
    				}
    			} else if (if_block7) {
    				if_block7.d(1);
    				if_block7 = null;
    			}

    			if (/*sortedplastic*/ ctx[8]) {
    				if (if_block8) ; else {
    					if_block8 = create_if_block_109(ctx);
    					if_block8.c();
    					if_block8.m(div1, t10);
    				}
    			} else if (if_block8) {
    				if_block8.d(1);
    				if_block8 = null;
    			}

    			if (/*oeb*/ ctx[20]) {
    				if (if_block9) ; else {
    					if_block9 = create_if_block_108(ctx);
    					if_block9.c();
    					if_block9.m(div1, t11);
    				}
    			} else if (if_block9) {
    				if_block9.d(1);
    				if_block9 = null;
    			}

    			if (/*musicposters*/ ctx[9]) {
    				if (if_block10) ; else {
    					if_block10 = create_if_block_107(ctx);
    					if_block10.c();
    					if_block10.m(div1, t12);
    				}
    			} else if (if_block10) {
    				if_block10.d(1);
    				if_block10 = null;
    			}

    			if (/*timatal*/ ctx[10]) {
    				if (if_block11) ; else {
    					if_block11 = create_if_block_106(ctx);
    					if_block11.c();
    					if_block11.m(div1, t13);
    				}
    			} else if (if_block11) {
    				if_block11.d(1);
    				if_block11 = null;
    			}

    			if (/*tools*/ ctx[11]) {
    				if (if_block12) ; else {
    					if_block12 = create_if_block_105(ctx);
    					if_block12.c();
    					if_block12.m(div1, t14);
    				}
    			} else if (if_block12) {
    				if_block12.d(1);
    				if_block12 = null;
    			}

    			if (/*trash*/ ctx[12]) {
    				if (if_block13) ; else {
    					if_block13 = create_if_block_104(ctx);
    					if_block13.c();
    					if_block13.m(div1, t15);
    				}
    			} else if (if_block13) {
    				if_block13.d(1);
    				if_block13 = null;
    			}

    			if (/*musicbook*/ ctx[13]) {
    				if (if_block14) ; else {
    					if_block14 = create_if_block_103(ctx);
    					if_block14.c();
    					if_block14.m(div1, t16);
    				}
    			} else if (if_block14) {
    				if_block14.d(1);
    				if_block14 = null;
    			}

    			if (/*corruptedspace*/ ctx[14]) {
    				if (if_block15) ; else {
    					if_block15 = create_if_block_102(ctx);
    					if_block15.c();
    					if_block15.m(div1, t17);
    				}
    			} else if (if_block15) {
    				if_block15.d(1);
    				if_block15 = null;
    			}

    			if (/*oilbuddies*/ ctx[15]) {
    				if (if_block16) ; else {
    					if_block16 = create_if_block_101(ctx);
    					if_block16.c();
    					if_block16.m(div1, t18);
    				}
    			} else if (if_block16) {
    				if_block16.d(1);
    				if_block16 = null;
    			}

    			if (/*litabok*/ ctx[16]) {
    				if (if_block17) ; else {
    					if_block17 = create_if_block_100(ctx);
    					if_block17.c();
    					if_block17.m(div1, t19);
    				}
    			} else if (if_block17) {
    				if_block17.d(1);
    				if_block17 = null;
    			}

    			if (/*plastica*/ ctx[17]) {
    				if (if_block18) ; else {
    					if_block18 = create_if_block_99(ctx);
    					if_block18.c();
    					if_block18.m(div1, t20);
    				}
    			} else if (if_block18) {
    				if_block18.d(1);
    				if_block18 = null;
    			}

    			if (/*familiarfaces*/ ctx[18]) {
    				if (if_block19) ; else {
    					if_block19 = create_if_block_98(ctx);
    					if_block19.c();
    					if_block19.m(div1, t21);
    				}
    			} else if (if_block19) {
    				if_block19.d(1);
    				if_block19 = null;
    			}

    			if (/*likamar*/ ctx[19]) {
    				if (if_block20) ; else {
    					if_block20 = create_if_block_97(ctx);
    					if_block20.c();
    					if_block20.m(div1, t22);
    				}
    			} else if (if_block20) {
    				if_block20.d(1);
    				if_block20 = null;
    			}

    			if (/*bread*/ ctx[22]) {
    				if (if_block21) ; else {
    					if_block21 = create_if_block_96(ctx);
    					if_block21.c();
    					if_block21.m(div1, t23);
    				}
    			} else if (if_block21) {
    				if_block21.d(1);
    				if_block21 = null;
    			}

    			if (/*breadmag*/ ctx[24]) {
    				if (if_block22) ; else {
    					if_block22 = create_if_block_95(ctx);
    					if_block22.c();
    					if_block22.m(div1, t24);
    				}
    			} else if (if_block22) {
    				if_block22.d(1);
    				if_block22 = null;
    			}

    			if (/*flora*/ ctx[23]) {
    				if (if_block23) ; else {
    					if_block23 = create_if_block_94(ctx);
    					if_block23.c();
    					if_block23.m(div1, t25);
    				}
    			} else if (if_block23) {
    				if_block23.d(1);
    				if_block23 = null;
    			}

    			if (/*evublad*/ ctx[25]) {
    				if (if_block24) ; else {
    					if_block24 = create_if_block_93(ctx);
    					if_block24.c();
    					if_block24.m(div1, null);
    				}
    			} else if (if_block24) {
    				if_block24.d(1);
    				if_block24 = null;
    			}

    			if (/*frontscreen*/ ctx[1]) {
    				if (if_block25) ; else {
    					if_block25 = create_if_block_92(ctx);
    					if_block25.c();
    					if_block25.m(span0, t27);
    				}
    			} else if (if_block25) {
    				if_block25.d(1);
    				if_block25 = null;
    			}

    			if (/*onourowntime*/ ctx[2]) {
    				if (if_block26) ; else {
    					if_block26 = create_if_block_91(ctx);
    					if_block26.c();
    					if_block26.m(span0, t28);
    				}
    			} else if (if_block26) {
    				if_block26.d(1);
    				if_block26 = null;
    			}

    			if (/*green*/ ctx[3]) {
    				if (if_block27) ; else {
    					if_block27 = create_if_block_90(ctx);
    					if_block27.c();
    					if_block27.m(span0, t29);
    				}
    			} else if (if_block27) {
    				if_block27.d(1);
    				if_block27 = null;
    			}

    			if (/*viv*/ ctx[4]) {
    				if (if_block28) ; else {
    					if_block28 = create_if_block_89(ctx);
    					if_block28.c();
    					if_block28.m(span0, t30);
    				}
    			} else if (if_block28) {
    				if_block28.d(1);
    				if_block28 = null;
    			}

    			if (/*bread*/ ctx[22]) {
    				if (if_block29) ; else {
    					if_block29 = create_if_block_88(ctx);
    					if_block29.c();
    					if_block29.m(span0, t31);
    				}
    			} else if (if_block29) {
    				if_block29.d(1);
    				if_block29 = null;
    			}

    			if (/*breadmag*/ ctx[24]) {
    				if (if_block30) ; else {
    					if_block30 = create_if_block_87(ctx);
    					if_block30.c();
    					if_block30.m(span0, t32);
    				}
    			} else if (if_block30) {
    				if_block30.d(1);
    				if_block30 = null;
    			}

    			if (/*portfolioio*/ ctx[7]) {
    				if (if_block31) ; else {
    					if_block31 = create_if_block_86(ctx);
    					if_block31.c();
    					if_block31.m(span0, t33);
    				}
    			} else if (if_block31) {
    				if_block31.d(1);
    				if_block31 = null;
    			}

    			if (/*typoposters*/ ctx[5]) {
    				if (if_block32) ; else {
    					if_block32 = create_if_block_85(ctx);
    					if_block32.c();
    					if_block32.m(span0, t34);
    				}
    			} else if (if_block32) {
    				if_block32.d(1);
    				if_block32 = null;
    			}

    			if (/*beauimg*/ ctx[21]) {
    				if (if_block33) ; else {
    					if_block33 = create_if_block_84(ctx);
    					if_block33.c();
    					if_block33.m(span0, t35);
    				}
    			} else if (if_block33) {
    				if_block33.d(1);
    				if_block33 = null;
    			}

    			if (/*secret*/ ctx[6]) {
    				if (if_block34) ; else {
    					if_block34 = create_if_block_83(ctx);
    					if_block34.c();
    					if_block34.m(span0, t36);
    				}
    			} else if (if_block34) {
    				if_block34.d(1);
    				if_block34 = null;
    			}

    			if (/*sortedplastic*/ ctx[8]) {
    				if (if_block35) ; else {
    					if_block35 = create_if_block_82(ctx);
    					if_block35.c();
    					if_block35.m(span0, t37);
    				}
    			} else if (if_block35) {
    				if_block35.d(1);
    				if_block35 = null;
    			}

    			if (/*oeb*/ ctx[20]) {
    				if (if_block36) ; else {
    					if_block36 = create_if_block_81(ctx);
    					if_block36.c();
    					if_block36.m(span0, t38);
    				}
    			} else if (if_block36) {
    				if_block36.d(1);
    				if_block36 = null;
    			}

    			if (/*musicposters*/ ctx[9]) {
    				if (if_block37) ; else {
    					if_block37 = create_if_block_80(ctx);
    					if_block37.c();
    					if_block37.m(span0, t39);
    				}
    			} else if (if_block37) {
    				if_block37.d(1);
    				if_block37 = null;
    			}

    			if (/*timatal*/ ctx[10]) {
    				if (if_block38) ; else {
    					if_block38 = create_if_block_79(ctx);
    					if_block38.c();
    					if_block38.m(span0, t40);
    				}
    			} else if (if_block38) {
    				if_block38.d(1);
    				if_block38 = null;
    			}

    			if (/*tools*/ ctx[11]) {
    				if (if_block39) ; else {
    					if_block39 = create_if_block_78(ctx);
    					if_block39.c();
    					if_block39.m(span0, t41);
    				}
    			} else if (if_block39) {
    				if_block39.d(1);
    				if_block39 = null;
    			}

    			if (/*trash*/ ctx[12]) {
    				if (if_block40) ; else {
    					if_block40 = create_if_block_77(ctx);
    					if_block40.c();
    					if_block40.m(span0, t42);
    				}
    			} else if (if_block40) {
    				if_block40.d(1);
    				if_block40 = null;
    			}

    			if (/*musicbook*/ ctx[13]) {
    				if (if_block41) ; else {
    					if_block41 = create_if_block_76(ctx);
    					if_block41.c();
    					if_block41.m(span0, t43);
    				}
    			} else if (if_block41) {
    				if_block41.d(1);
    				if_block41 = null;
    			}

    			if (/*corruptedspace*/ ctx[14]) {
    				if (if_block42) ; else {
    					if_block42 = create_if_block_75(ctx);
    					if_block42.c();
    					if_block42.m(span0, t44);
    				}
    			} else if (if_block42) {
    				if_block42.d(1);
    				if_block42 = null;
    			}

    			if (/*oilbuddies*/ ctx[15]) {
    				if (if_block43) ; else {
    					if_block43 = create_if_block_74(ctx);
    					if_block43.c();
    					if_block43.m(span0, t45);
    				}
    			} else if (if_block43) {
    				if_block43.d(1);
    				if_block43 = null;
    			}

    			if (/*litabok*/ ctx[16]) {
    				if (if_block44) ; else {
    					if_block44 = create_if_block_73(ctx);
    					if_block44.c();
    					if_block44.m(span0, t46);
    				}
    			} else if (if_block44) {
    				if_block44.d(1);
    				if_block44 = null;
    			}

    			if (/*plastica*/ ctx[17]) {
    				if (if_block45) ; else {
    					if_block45 = create_if_block_72(ctx);
    					if_block45.c();
    					if_block45.m(span0, t47);
    				}
    			} else if (if_block45) {
    				if_block45.d(1);
    				if_block45 = null;
    			}

    			if (/*familiarfaces*/ ctx[18]) {
    				if (if_block46) ; else {
    					if_block46 = create_if_block_71(ctx);
    					if_block46.c();
    					if_block46.m(span0, t48);
    				}
    			} else if (if_block46) {
    				if_block46.d(1);
    				if_block46 = null;
    			}

    			if (/*likamar*/ ctx[19]) {
    				if (if_block47) ; else {
    					if_block47 = create_if_block_70(ctx);
    					if_block47.c();
    					if_block47.m(span0, t49);
    				}
    			} else if (if_block47) {
    				if_block47.d(1);
    				if_block47 = null;
    			}

    			if (/*flora*/ ctx[23]) {
    				if (if_block48) ; else {
    					if_block48 = create_if_block_69(ctx);
    					if_block48.c();
    					if_block48.m(span0, t50);
    				}
    			} else if (if_block48) {
    				if_block48.d(1);
    				if_block48 = null;
    			}

    			if (/*evublad*/ ctx[25]) {
    				if (if_block49) ; else {
    					if_block49 = create_if_block_68(ctx);
    					if_block49.c();
    					if_block49.m(span0, null);
    				}
    			} else if (if_block49) {
    				if_block49.d(1);
    				if_block49 = null;
    			}

    			if (/*frontscreen*/ ctx[1]) {
    				if (if_block50) ; else {
    					if_block50 = create_if_block_67(ctx);
    					if_block50.c();
    					if_block50.m(div3, t52);
    				}
    			} else if (if_block50) {
    				if_block50.d(1);
    				if_block50 = null;
    			}

    			if (/*onourowntime*/ ctx[2]) {
    				if (if_block51) ; else {
    					if_block51 = create_if_block_66(ctx);
    					if_block51.c();
    					if_block51.m(div3, t53);
    				}
    			} else if (if_block51) {
    				if_block51.d(1);
    				if_block51 = null;
    			}

    			if (/*green*/ ctx[3]) {
    				if (if_block52) ; else {
    					if_block52 = create_if_block_65(ctx);
    					if_block52.c();
    					if_block52.m(div3, t54);
    				}
    			} else if (if_block52) {
    				if_block52.d(1);
    				if_block52 = null;
    			}

    			if (/*viv*/ ctx[4]) {
    				if (if_block53) ; else {
    					if_block53 = create_if_block_64(ctx);
    					if_block53.c();
    					if_block53.m(div3, t55);
    				}
    			} else if (if_block53) {
    				if_block53.d(1);
    				if_block53 = null;
    			}

    			if (/*bread*/ ctx[22]) {
    				if (if_block54) ; else {
    					if_block54 = create_if_block_63(ctx);
    					if_block54.c();
    					if_block54.m(div3, t56);
    				}
    			} else if (if_block54) {
    				if_block54.d(1);
    				if_block54 = null;
    			}

    			if (/*breadmag*/ ctx[24]) {
    				if (if_block55) ; else {
    					if_block55 = create_if_block_62(ctx);
    					if_block55.c();
    					if_block55.m(div3, t57);
    				}
    			} else if (if_block55) {
    				if_block55.d(1);
    				if_block55 = null;
    			}

    			if (/*portfolioio*/ ctx[7]) {
    				if (if_block56) ; else {
    					if_block56 = create_if_block_61(ctx);
    					if_block56.c();
    					if_block56.m(div3, t58);
    				}
    			} else if (if_block56) {
    				if_block56.d(1);
    				if_block56 = null;
    			}

    			if (/*typoposters*/ ctx[5]) {
    				if (if_block57) ; else {
    					if_block57 = create_if_block_60(ctx);
    					if_block57.c();
    					if_block57.m(div3, t59);
    				}
    			} else if (if_block57) {
    				if_block57.d(1);
    				if_block57 = null;
    			}

    			if (/*beauimg*/ ctx[21]) {
    				if (if_block58) ; else {
    					if_block58 = create_if_block_59(ctx);
    					if_block58.c();
    					if_block58.m(div3, t60);
    				}
    			} else if (if_block58) {
    				if_block58.d(1);
    				if_block58 = null;
    			}

    			if (/*secret*/ ctx[6]) {
    				if (if_block59) ; else {
    					if_block59 = create_if_block_58(ctx);
    					if_block59.c();
    					if_block59.m(div3, t61);
    				}
    			} else if (if_block59) {
    				if_block59.d(1);
    				if_block59 = null;
    			}

    			if (/*sortedplastic*/ ctx[8]) {
    				if (if_block60) ; else {
    					if_block60 = create_if_block_57(ctx);
    					if_block60.c();
    					if_block60.m(div3, t62);
    				}
    			} else if (if_block60) {
    				if_block60.d(1);
    				if_block60 = null;
    			}

    			if (/*oeb*/ ctx[20]) {
    				if (if_block61) ; else {
    					if_block61 = create_if_block_56(ctx);
    					if_block61.c();
    					if_block61.m(div3, t63);
    				}
    			} else if (if_block61) {
    				if_block61.d(1);
    				if_block61 = null;
    			}

    			if (/*musicposters*/ ctx[9]) {
    				if (if_block62) ; else {
    					if_block62 = create_if_block_55(ctx);
    					if_block62.c();
    					if_block62.m(div3, t64);
    				}
    			} else if (if_block62) {
    				if_block62.d(1);
    				if_block62 = null;
    			}

    			if (/*timatal*/ ctx[10]) {
    				if (if_block63) ; else {
    					if_block63 = create_if_block_54(ctx);
    					if_block63.c();
    					if_block63.m(div3, t65);
    				}
    			} else if (if_block63) {
    				if_block63.d(1);
    				if_block63 = null;
    			}

    			if (/*tools*/ ctx[11]) {
    				if (if_block64) ; else {
    					if_block64 = create_if_block_53(ctx);
    					if_block64.c();
    					if_block64.m(div3, t66);
    				}
    			} else if (if_block64) {
    				if_block64.d(1);
    				if_block64 = null;
    			}

    			if (/*trash*/ ctx[12]) {
    				if (if_block65) ; else {
    					if_block65 = create_if_block_52(ctx);
    					if_block65.c();
    					if_block65.m(div3, t67);
    				}
    			} else if (if_block65) {
    				if_block65.d(1);
    				if_block65 = null;
    			}

    			if (/*musicbook*/ ctx[13]) {
    				if (if_block66) ; else {
    					if_block66 = create_if_block_51(ctx);
    					if_block66.c();
    					if_block66.m(div3, t68);
    				}
    			} else if (if_block66) {
    				if_block66.d(1);
    				if_block66 = null;
    			}

    			if (/*corruptedspace*/ ctx[14]) {
    				if (if_block67) ; else {
    					if_block67 = create_if_block_50(ctx);
    					if_block67.c();
    					if_block67.m(div3, t69);
    				}
    			} else if (if_block67) {
    				if_block67.d(1);
    				if_block67 = null;
    			}

    			if (/*oilbuddies*/ ctx[15]) {
    				if (if_block68) ; else {
    					if_block68 = create_if_block_49(ctx);
    					if_block68.c();
    					if_block68.m(div3, t70);
    				}
    			} else if (if_block68) {
    				if_block68.d(1);
    				if_block68 = null;
    			}

    			if (/*litabok*/ ctx[16]) {
    				if (if_block69) ; else {
    					if_block69 = create_if_block_48(ctx);
    					if_block69.c();
    					if_block69.m(div3, t71);
    				}
    			} else if (if_block69) {
    				if_block69.d(1);
    				if_block69 = null;
    			}

    			if (/*plastica*/ ctx[17]) {
    				if (if_block70) ; else {
    					if_block70 = create_if_block_47(ctx);
    					if_block70.c();
    					if_block70.m(div3, t72);
    				}
    			} else if (if_block70) {
    				if_block70.d(1);
    				if_block70 = null;
    			}

    			if (/*familiarfaces*/ ctx[18]) {
    				if (if_block71) ; else {
    					if_block71 = create_if_block_46(ctx);
    					if_block71.c();
    					if_block71.m(div3, t73);
    				}
    			} else if (if_block71) {
    				if_block71.d(1);
    				if_block71 = null;
    			}

    			if (/*likamar*/ ctx[19]) {
    				if (if_block72) ; else {
    					if_block72 = create_if_block_45(ctx);
    					if_block72.c();
    					if_block72.m(div3, t74);
    				}
    			} else if (if_block72) {
    				if_block72.d(1);
    				if_block72 = null;
    			}

    			if (/*flora*/ ctx[23]) {
    				if (if_block73) ; else {
    					if_block73 = create_if_block_44(ctx);
    					if_block73.c();
    					if_block73.m(div3, t75);
    				}
    			} else if (if_block73) {
    				if_block73.d(1);
    				if_block73 = null;
    			}

    			if (/*evublad*/ ctx[25]) {
    				if (if_block74) ; else {
    					if_block74 = create_if_block_43(ctx);
    					if_block74.c();
    					if_block74.m(div3, null);
    				}
    			} else if (if_block74) {
    				if_block74.d(1);
    				if_block74 = null;
    			}

    			if (/*frontscreen*/ ctx[1]) {
    				if (if_block75) ; else {
    					if_block75 = create_if_block_42(ctx);
    					if_block75.c();
    					if_block75.m(span1, t77);
    				}
    			} else if (if_block75) {
    				if_block75.d(1);
    				if_block75 = null;
    			}

    			if (/*onourowntime*/ ctx[2]) {
    				if (if_block76) ; else {
    					if_block76 = create_if_block_41(ctx);
    					if_block76.c();
    					if_block76.m(span1, t78);
    				}
    			} else if (if_block76) {
    				if_block76.d(1);
    				if_block76 = null;
    			}

    			if (/*viv*/ ctx[4]) {
    				if (if_block77) ; else {
    					if_block77 = create_if_block_40(ctx);
    					if_block77.c();
    					if_block77.m(span1, t79);
    				}
    			} else if (if_block77) {
    				if_block77.d(1);
    				if_block77 = null;
    			}

    			if (/*typoposters*/ ctx[5]) {
    				if (if_block78) ; else {
    					if_block78 = create_if_block_39(ctx);
    					if_block78.c();
    					if_block78.m(span1, t80);
    				}
    			} else if (if_block78) {
    				if_block78.d(1);
    				if_block78 = null;
    			}

    			if (/*secret*/ ctx[6]) {
    				if (if_block79) ; else {
    					if_block79 = create_if_block_38(ctx);
    					if_block79.c();
    					if_block79.m(span1, t81);
    				}
    			} else if (if_block79) {
    				if_block79.d(1);
    				if_block79 = null;
    			}

    			if (/*tools*/ ctx[11]) {
    				if (if_block80) ; else {
    					if_block80 = create_if_block_37(ctx);
    					if_block80.c();
    					if_block80.m(span1, t82);
    				}
    			} else if (if_block80) {
    				if_block80.d(1);
    				if_block80 = null;
    			}

    			if (/*timatal*/ ctx[10]) {
    				if (if_block81) ; else {
    					if_block81 = create_if_block_36(ctx);
    					if_block81.c();
    					if_block81.m(span1, t83);
    				}
    			} else if (if_block81) {
    				if_block81.d(1);
    				if_block81 = null;
    			}

    			if (/*sortedplastic*/ ctx[8]) {
    				if (if_block82) ; else {
    					if_block82 = create_if_block_35(ctx);
    					if_block82.c();
    					if_block82.m(span1, t84);
    				}
    			} else if (if_block82) {
    				if_block82.d(1);
    				if_block82 = null;
    			}

    			if (/*litabok*/ ctx[16]) {
    				if (if_block83) ; else {
    					if_block83 = create_if_block_34(ctx);
    					if_block83.c();
    					if_block83.m(span1, t85);
    				}
    			} else if (if_block83) {
    				if_block83.d(1);
    				if_block83 = null;
    			}

    			if (/*oilbuddies*/ ctx[15]) {
    				if (if_block84) ; else {
    					if_block84 = create_if_block_33(ctx);
    					if_block84.c();
    					if_block84.m(span1, t86);
    				}
    			} else if (if_block84) {
    				if_block84.d(1);
    				if_block84 = null;
    			}

    			if (/*trash*/ ctx[12]) {
    				if (if_block85) ; else {
    					if_block85 = create_if_block_32(ctx);
    					if_block85.c();
    					if_block85.m(span1, t87);
    				}
    			} else if (if_block85) {
    				if_block85.d(1);
    				if_block85 = null;
    			}

    			if (/*familiarfaces*/ ctx[18]) {
    				if (if_block86) ; else {
    					if_block86 = create_if_block_31(ctx);
    					if_block86.c();
    					if_block86.m(span1, t88);
    				}
    			} else if (if_block86) {
    				if_block86.d(1);
    				if_block86 = null;
    			}

    			if (/*musicbook*/ ctx[13]) {
    				if (if_block87) ; else {
    					if_block87 = create_if_block_30(ctx);
    					if_block87.c();
    					if_block87.m(span1, t89);
    				}
    			} else if (if_block87) {
    				if_block87.d(1);
    				if_block87 = null;
    			}

    			if (/*plastica*/ ctx[17]) {
    				if (if_block88) ; else {
    					if_block88 = create_if_block_29(ctx);
    					if_block88.c();
    					if_block88.m(span1, t90);
    				}
    			} else if (if_block88) {
    				if_block88.d(1);
    				if_block88 = null;
    			}

    			if (/*corruptedspace*/ ctx[14]) {
    				if (if_block89) ; else {
    					if_block89 = create_if_block_28(ctx);
    					if_block89.c();
    					if_block89.m(span1, t91);
    				}
    			} else if (if_block89) {
    				if_block89.d(1);
    				if_block89 = null;
    			}

    			if (/*likamar*/ ctx[19]) {
    				if (if_block90) ; else {
    					if_block90 = create_if_block_27(ctx);
    					if_block90.c();
    					if_block90.m(span1, t92);
    				}
    			} else if (if_block90) {
    				if_block90.d(1);
    				if_block90 = null;
    			}

    			if (/*green*/ ctx[3]) {
    				if (if_block91) ; else {
    					if_block91 = create_if_block_26(ctx);
    					if_block91.c();
    					if_block91.m(span1, t93);
    				}
    			} else if (if_block91) {
    				if_block91.d(1);
    				if_block91 = null;
    			}

    			if (/*evublad*/ ctx[25]) {
    				if (if_block92) ; else {
    					if_block92 = create_if_block_25(ctx);
    					if_block92.c();
    					if_block92.m(span1, null);
    				}
    			} else if (if_block92) {
    				if_block92.d(1);
    				if_block92 = null;
    			}

    			if (/*onourowntime*/ ctx[2]) {
    				if (if_block93) {
    					if (dirty[0] & /*onourowntime*/ 4) {
    						transition_in(if_block93, 1);
    					}
    				} else {
    					if_block93 = create_if_block_24(ctx);
    					if_block93.c();
    					transition_in(if_block93, 1);
    					if_block93.m(div5, t95);
    				}
    			} else if (if_block93) {
    				group_outros();

    				transition_out(if_block93, 1, 1, () => {
    					if_block93 = null;
    				});

    				check_outros();
    			}

    			if (/*green*/ ctx[3]) {
    				if (if_block94) {
    					if (dirty[0] & /*green*/ 8) {
    						transition_in(if_block94, 1);
    					}
    				} else {
    					if_block94 = create_if_block_23(ctx);
    					if_block94.c();
    					transition_in(if_block94, 1);
    					if_block94.m(div5, t96);
    				}
    			} else if (if_block94) {
    				group_outros();

    				transition_out(if_block94, 1, 1, () => {
    					if_block94 = null;
    				});

    				check_outros();
    			}

    			if (/*viv*/ ctx[4]) {
    				if (if_block95) {
    					if (dirty[0] & /*viv*/ 16) {
    						transition_in(if_block95, 1);
    					}
    				} else {
    					if_block95 = create_if_block_22(ctx);
    					if_block95.c();
    					transition_in(if_block95, 1);
    					if_block95.m(div5, t97);
    				}
    			} else if (if_block95) {
    				group_outros();

    				transition_out(if_block95, 1, 1, () => {
    					if_block95 = null;
    				});

    				check_outros();
    			}

    			if (/*portfolioio*/ ctx[7]) {
    				if (if_block96) {
    					if (dirty[0] & /*portfolioio*/ 128) {
    						transition_in(if_block96, 1);
    					}
    				} else {
    					if_block96 = create_if_block_21(ctx);
    					if_block96.c();
    					transition_in(if_block96, 1);
    					if_block96.m(div5, t98);
    				}
    			} else if (if_block96) {
    				group_outros();

    				transition_out(if_block96, 1, 1, () => {
    					if_block96 = null;
    				});

    				check_outros();
    			}

    			if (/*typoposters*/ ctx[5]) {
    				if (if_block97) {
    					if (dirty[0] & /*typoposters*/ 32) {
    						transition_in(if_block97, 1);
    					}
    				} else {
    					if_block97 = create_if_block_20(ctx);
    					if_block97.c();
    					transition_in(if_block97, 1);
    					if_block97.m(div5, t99);
    				}
    			} else if (if_block97) {
    				group_outros();

    				transition_out(if_block97, 1, 1, () => {
    					if_block97 = null;
    				});

    				check_outros();
    			}

    			if (/*secret*/ ctx[6]) {
    				if (if_block98) {
    					if (dirty[0] & /*secret*/ 64) {
    						transition_in(if_block98, 1);
    					}
    				} else {
    					if_block98 = create_if_block_19(ctx);
    					if_block98.c();
    					transition_in(if_block98, 1);
    					if_block98.m(div5, t100);
    				}
    			} else if (if_block98) {
    				group_outros();

    				transition_out(if_block98, 1, 1, () => {
    					if_block98 = null;
    				});

    				check_outros();
    			}

    			if (/*sortedplastic*/ ctx[8]) {
    				if (if_block99) {
    					if (dirty[0] & /*sortedplastic*/ 256) {
    						transition_in(if_block99, 1);
    					}
    				} else {
    					if_block99 = create_if_block_18(ctx);
    					if_block99.c();
    					transition_in(if_block99, 1);
    					if_block99.m(div5, t101);
    				}
    			} else if (if_block99) {
    				group_outros();

    				transition_out(if_block99, 1, 1, () => {
    					if_block99 = null;
    				});

    				check_outros();
    			}

    			if (/*musicposters*/ ctx[9]) {
    				if (if_block100) {
    					if (dirty[0] & /*musicposters*/ 512) {
    						transition_in(if_block100, 1);
    					}
    				} else {
    					if_block100 = create_if_block_17(ctx);
    					if_block100.c();
    					transition_in(if_block100, 1);
    					if_block100.m(div5, t102);
    				}
    			} else if (if_block100) {
    				group_outros();

    				transition_out(if_block100, 1, 1, () => {
    					if_block100 = null;
    				});

    				check_outros();
    			}

    			if (/*timatal*/ ctx[10]) {
    				if (if_block101) {
    					if (dirty[0] & /*timatal*/ 1024) {
    						transition_in(if_block101, 1);
    					}
    				} else {
    					if_block101 = create_if_block_16(ctx);
    					if_block101.c();
    					transition_in(if_block101, 1);
    					if_block101.m(div5, t103);
    				}
    			} else if (if_block101) {
    				group_outros();

    				transition_out(if_block101, 1, 1, () => {
    					if_block101 = null;
    				});

    				check_outros();
    			}

    			if (/*tools*/ ctx[11]) {
    				if (if_block102) {
    					if (dirty[0] & /*tools*/ 2048) {
    						transition_in(if_block102, 1);
    					}
    				} else {
    					if_block102 = create_if_block_15(ctx);
    					if_block102.c();
    					transition_in(if_block102, 1);
    					if_block102.m(div5, t104);
    				}
    			} else if (if_block102) {
    				group_outros();

    				transition_out(if_block102, 1, 1, () => {
    					if_block102 = null;
    				});

    				check_outros();
    			}

    			if (/*trash*/ ctx[12]) {
    				if (if_block103) {
    					if (dirty[0] & /*trash*/ 4096) {
    						transition_in(if_block103, 1);
    					}
    				} else {
    					if_block103 = create_if_block_14(ctx);
    					if_block103.c();
    					transition_in(if_block103, 1);
    					if_block103.m(div5, t105);
    				}
    			} else if (if_block103) {
    				group_outros();

    				transition_out(if_block103, 1, 1, () => {
    					if_block103 = null;
    				});

    				check_outros();
    			}

    			if (/*musicbook*/ ctx[13]) {
    				if (if_block104) {
    					if (dirty[0] & /*musicbook*/ 8192) {
    						transition_in(if_block104, 1);
    					}
    				} else {
    					if_block104 = create_if_block_13(ctx);
    					if_block104.c();
    					transition_in(if_block104, 1);
    					if_block104.m(div5, t106);
    				}
    			} else if (if_block104) {
    				group_outros();

    				transition_out(if_block104, 1, 1, () => {
    					if_block104 = null;
    				});

    				check_outros();
    			}

    			if (/*corruptedspace*/ ctx[14]) {
    				if (if_block105) {
    					if (dirty[0] & /*corruptedspace*/ 16384) {
    						transition_in(if_block105, 1);
    					}
    				} else {
    					if_block105 = create_if_block_12(ctx);
    					if_block105.c();
    					transition_in(if_block105, 1);
    					if_block105.m(div5, t107);
    				}
    			} else if (if_block105) {
    				group_outros();

    				transition_out(if_block105, 1, 1, () => {
    					if_block105 = null;
    				});

    				check_outros();
    			}

    			if (/*oilbuddies*/ ctx[15]) {
    				if (if_block106) {
    					if (dirty[0] & /*oilbuddies*/ 32768) {
    						transition_in(if_block106, 1);
    					}
    				} else {
    					if_block106 = create_if_block_11(ctx);
    					if_block106.c();
    					transition_in(if_block106, 1);
    					if_block106.m(div5, t108);
    				}
    			} else if (if_block106) {
    				group_outros();

    				transition_out(if_block106, 1, 1, () => {
    					if_block106 = null;
    				});

    				check_outros();
    			}

    			if (/*litabok*/ ctx[16]) {
    				if (if_block107) {
    					if (dirty[0] & /*litabok*/ 65536) {
    						transition_in(if_block107, 1);
    					}
    				} else {
    					if_block107 = create_if_block_10(ctx);
    					if_block107.c();
    					transition_in(if_block107, 1);
    					if_block107.m(div5, t109);
    				}
    			} else if (if_block107) {
    				group_outros();

    				transition_out(if_block107, 1, 1, () => {
    					if_block107 = null;
    				});

    				check_outros();
    			}

    			if (/*plastica*/ ctx[17]) {
    				if (if_block108) {
    					if (dirty[0] & /*plastica*/ 131072) {
    						transition_in(if_block108, 1);
    					}
    				} else {
    					if_block108 = create_if_block_9(ctx);
    					if_block108.c();
    					transition_in(if_block108, 1);
    					if_block108.m(div5, t110);
    				}
    			} else if (if_block108) {
    				group_outros();

    				transition_out(if_block108, 1, 1, () => {
    					if_block108 = null;
    				});

    				check_outros();
    			}

    			if (/*familiarfaces*/ ctx[18]) {
    				if (if_block109) {
    					if (dirty[0] & /*familiarfaces*/ 262144) {
    						transition_in(if_block109, 1);
    					}
    				} else {
    					if_block109 = create_if_block_8(ctx);
    					if_block109.c();
    					transition_in(if_block109, 1);
    					if_block109.m(div5, t111);
    				}
    			} else if (if_block109) {
    				group_outros();

    				transition_out(if_block109, 1, 1, () => {
    					if_block109 = null;
    				});

    				check_outros();
    			}

    			if (/*likamar*/ ctx[19]) {
    				if (if_block110) {
    					if (dirty[0] & /*likamar*/ 524288) {
    						transition_in(if_block110, 1);
    					}
    				} else {
    					if_block110 = create_if_block_7(ctx);
    					if_block110.c();
    					transition_in(if_block110, 1);
    					if_block110.m(div5, t112);
    				}
    			} else if (if_block110) {
    				group_outros();

    				transition_out(if_block110, 1, 1, () => {
    					if_block110 = null;
    				});

    				check_outros();
    			}

    			if (/*oeb*/ ctx[20]) {
    				if (if_block111) {
    					if (dirty[0] & /*oeb*/ 1048576) {
    						transition_in(if_block111, 1);
    					}
    				} else {
    					if_block111 = create_if_block_6(ctx);
    					if_block111.c();
    					transition_in(if_block111, 1);
    					if_block111.m(div5, t113);
    				}
    			} else if (if_block111) {
    				group_outros();

    				transition_out(if_block111, 1, 1, () => {
    					if_block111 = null;
    				});

    				check_outros();
    			}

    			if (/*beauimg*/ ctx[21]) {
    				if (if_block112) {
    					if (dirty[0] & /*beauimg*/ 2097152) {
    						transition_in(if_block112, 1);
    					}
    				} else {
    					if_block112 = create_if_block_5(ctx);
    					if_block112.c();
    					transition_in(if_block112, 1);
    					if_block112.m(div5, t114);
    				}
    			} else if (if_block112) {
    				group_outros();

    				transition_out(if_block112, 1, 1, () => {
    					if_block112 = null;
    				});

    				check_outros();
    			}

    			if (/*bread*/ ctx[22]) {
    				if (if_block113) {
    					if (dirty[0] & /*bread*/ 4194304) {
    						transition_in(if_block113, 1);
    					}
    				} else {
    					if_block113 = create_if_block_4(ctx);
    					if_block113.c();
    					transition_in(if_block113, 1);
    					if_block113.m(div5, t115);
    				}
    			} else if (if_block113) {
    				group_outros();

    				transition_out(if_block113, 1, 1, () => {
    					if_block113 = null;
    				});

    				check_outros();
    			}

    			if (/*flora*/ ctx[23]) {
    				if (if_block114) {
    					if (dirty[0] & /*flora*/ 8388608) {
    						transition_in(if_block114, 1);
    					}
    				} else {
    					if_block114 = create_if_block_3(ctx);
    					if_block114.c();
    					transition_in(if_block114, 1);
    					if_block114.m(div5, t116);
    				}
    			} else if (if_block114) {
    				group_outros();

    				transition_out(if_block114, 1, 1, () => {
    					if_block114 = null;
    				});

    				check_outros();
    			}

    			if (/*breadmag*/ ctx[24]) {
    				if (if_block115) {
    					if (dirty[0] & /*breadmag*/ 16777216) {
    						transition_in(if_block115, 1);
    					}
    				} else {
    					if_block115 = create_if_block_2(ctx);
    					if_block115.c();
    					transition_in(if_block115, 1);
    					if_block115.m(div5, t117);
    				}
    			} else if (if_block115) {
    				group_outros();

    				transition_out(if_block115, 1, 1, () => {
    					if_block115 = null;
    				});

    				check_outros();
    			}

    			if (/*evublad*/ ctx[25]) {
    				if (if_block116) {
    					if (dirty[0] & /*evublad*/ 33554432) {
    						transition_in(if_block116, 1);
    					}
    				} else {
    					if_block116 = create_if_block_1(ctx);
    					if_block116.c();
    					transition_in(if_block116, 1);
    					if_block116.m(div5, null);
    				}
    			} else if (if_block116) {
    				group_outros();

    				transition_out(if_block116, 1, 1, () => {
    					if_block116 = null;
    				});

    				check_outros();
    			}

    			if (dirty[0] & /*expand*/ 1) {
    				toggle_class(div5, "expand", /*expand*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block93);
    			transition_in(if_block94);
    			transition_in(if_block95);
    			transition_in(if_block96);
    			transition_in(if_block97);
    			transition_in(if_block98);
    			transition_in(if_block99);
    			transition_in(if_block100);
    			transition_in(if_block101);
    			transition_in(if_block102);
    			transition_in(if_block103);
    			transition_in(if_block104);
    			transition_in(if_block105);
    			transition_in(if_block106);
    			transition_in(if_block107);
    			transition_in(if_block108);
    			transition_in(if_block109);
    			transition_in(if_block110);
    			transition_in(if_block111);
    			transition_in(if_block112);
    			transition_in(if_block113);
    			transition_in(if_block114);
    			transition_in(if_block115);
    			transition_in(if_block116);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block93);
    			transition_out(if_block94);
    			transition_out(if_block95);
    			transition_out(if_block96);
    			transition_out(if_block97);
    			transition_out(if_block98);
    			transition_out(if_block99);
    			transition_out(if_block100);
    			transition_out(if_block101);
    			transition_out(if_block102);
    			transition_out(if_block103);
    			transition_out(if_block104);
    			transition_out(if_block105);
    			transition_out(if_block106);
    			transition_out(if_block107);
    			transition_out(if_block108);
    			transition_out(if_block109);
    			transition_out(if_block110);
    			transition_out(if_block111);
    			transition_out(if_block112);
    			transition_out(if_block113);
    			transition_out(if_block114);
    			transition_out(if_block115);
    			transition_out(if_block116);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			if (if_block8) if_block8.d();
    			if (if_block9) if_block9.d();
    			if (if_block10) if_block10.d();
    			if (if_block11) if_block11.d();
    			if (if_block12) if_block12.d();
    			if (if_block13) if_block13.d();
    			if (if_block14) if_block14.d();
    			if (if_block15) if_block15.d();
    			if (if_block16) if_block16.d();
    			if (if_block17) if_block17.d();
    			if (if_block18) if_block18.d();
    			if (if_block19) if_block19.d();
    			if (if_block20) if_block20.d();
    			if (if_block21) if_block21.d();
    			if (if_block22) if_block22.d();
    			if (if_block23) if_block23.d();
    			if (if_block24) if_block24.d();
    			if (if_block25) if_block25.d();
    			if (if_block26) if_block26.d();
    			if (if_block27) if_block27.d();
    			if (if_block28) if_block28.d();
    			if (if_block29) if_block29.d();
    			if (if_block30) if_block30.d();
    			if (if_block31) if_block31.d();
    			if (if_block32) if_block32.d();
    			if (if_block33) if_block33.d();
    			if (if_block34) if_block34.d();
    			if (if_block35) if_block35.d();
    			if (if_block36) if_block36.d();
    			if (if_block37) if_block37.d();
    			if (if_block38) if_block38.d();
    			if (if_block39) if_block39.d();
    			if (if_block40) if_block40.d();
    			if (if_block41) if_block41.d();
    			if (if_block42) if_block42.d();
    			if (if_block43) if_block43.d();
    			if (if_block44) if_block44.d();
    			if (if_block45) if_block45.d();
    			if (if_block46) if_block46.d();
    			if (if_block47) if_block47.d();
    			if (if_block48) if_block48.d();
    			if (if_block49) if_block49.d();
    			if (if_block50) if_block50.d();
    			if (if_block51) if_block51.d();
    			if (if_block52) if_block52.d();
    			if (if_block53) if_block53.d();
    			if (if_block54) if_block54.d();
    			if (if_block55) if_block55.d();
    			if (if_block56) if_block56.d();
    			if (if_block57) if_block57.d();
    			if (if_block58) if_block58.d();
    			if (if_block59) if_block59.d();
    			if (if_block60) if_block60.d();
    			if (if_block61) if_block61.d();
    			if (if_block62) if_block62.d();
    			if (if_block63) if_block63.d();
    			if (if_block64) if_block64.d();
    			if (if_block65) if_block65.d();
    			if (if_block66) if_block66.d();
    			if (if_block67) if_block67.d();
    			if (if_block68) if_block68.d();
    			if (if_block69) if_block69.d();
    			if (if_block70) if_block70.d();
    			if (if_block71) if_block71.d();
    			if (if_block72) if_block72.d();
    			if (if_block73) if_block73.d();
    			if (if_block74) if_block74.d();
    			if (if_block75) if_block75.d();
    			if (if_block76) if_block76.d();
    			if (if_block77) if_block77.d();
    			if (if_block78) if_block78.d();
    			if (if_block79) if_block79.d();
    			if (if_block80) if_block80.d();
    			if (if_block81) if_block81.d();
    			if (if_block82) if_block82.d();
    			if (if_block83) if_block83.d();
    			if (if_block84) if_block84.d();
    			if (if_block85) if_block85.d();
    			if (if_block86) if_block86.d();
    			if (if_block87) if_block87.d();
    			if (if_block88) if_block88.d();
    			if (if_block89) if_block89.d();
    			if (if_block90) if_block90.d();
    			if (if_block91) if_block91.d();
    			if (if_block92) if_block92.d();
    			if (if_block93) if_block93.d();
    			if (if_block94) if_block94.d();
    			if (if_block95) if_block95.d();
    			if (if_block96) if_block96.d();
    			if (if_block97) if_block97.d();
    			if (if_block98) if_block98.d();
    			if (if_block99) if_block99.d();
    			if (if_block100) if_block100.d();
    			if (if_block101) if_block101.d();
    			if (if_block102) if_block102.d();
    			if (if_block103) if_block103.d();
    			if (if_block104) if_block104.d();
    			if (if_block105) if_block105.d();
    			if (if_block106) if_block106.d();
    			if (if_block107) if_block107.d();
    			if (if_block108) if_block108.d();
    			if (if_block109) if_block109.d();
    			if (if_block110) if_block110.d();
    			if (if_block111) if_block111.d();
    			if (if_block112) if_block112.d();
    			if (if_block113) if_block113.d();
    			if (if_block114) if_block114.d();
    			if (if_block115) if_block115.d();
    			if (if_block116) if_block116.d();
    			if (detaching) detach_dev(t118);
    			if (detaching) detach_dev(div7);
    			if (detaching) detach_dev(t134);
    			if (detaching) detach_dev(div11);
    			if (if_block117) if_block117.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let expand;
    	let frontscreen = true;
    	let other = true;
    	let onourowntime = false;
    	let green = false;
    	let viv = false;
    	let typoposters = false;
    	let secret = false;
    	let portfolioio = false;
    	let sortedplastic = false;
    	let musicposters = false;
    	let timatal = false;
    	let tools = false;
    	let trash = false;
    	let musicbook = false;
    	let corruptedspace = false;
    	let oilbuddies = false;
    	let litabok = false;
    	let plastica = false;
    	let familiarfaces = false;
    	let likamar = false;
    	let oeb = false;
    	let beauimg = false;
    	let bread = false;
    	let flora = false;
    	let breadmag = false;
    	let evublad = false;

    	//let distanceBLines = 'calc((95vh - 1px) / 9 * 1)';
    	//let marginSides = 'calc(100vw / 16)';
    	//let Main = false;
    	//const toggleHide = () => {
    	//	scrollToFront = false;
    	//	Main = true;
    	//}
    	const toggleonourowntime = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = true);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglegreen = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = true);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const toggleviv = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = true);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const toggleportfolioio = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = true);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const toggletypoposters = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = true);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglesecret = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = true);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglesortedplastic = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = true);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglemusicposters = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = true);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const toggletimatal = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = true);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const toggletools = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = true);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const toggleplastica = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = true);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglemusicbook = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = true);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglecorruptedspace = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = true);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const toggleoilbuddies = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = true);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglefamiliarfaces = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = true);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglelitabok = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = true);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const toggletrash = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = true);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglelikamar = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = true);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const toggleoeb = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = true);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglebeauimg = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = true);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglebread = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = true);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const toggleflora = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = true);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = false);
    	};

    	const togglebreadmag = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = true);
    		$$invalidate(25, evublad = false);
    	};

    	const toggleevublad = () => {
    		$$invalidate(1, frontscreen = false);
    		$$invalidate(2, onourowntime = false);
    		$$invalidate(3, green = false);
    		$$invalidate(4, viv = false);
    		$$invalidate(7, portfolioio = false);
    		$$invalidate(5, typoposters = false);
    		$$invalidate(6, secret = false);
    		$$invalidate(8, sortedplastic = false);
    		$$invalidate(9, musicposters = false);
    		$$invalidate(10, timatal = false);
    		$$invalidate(11, tools = false);
    		$$invalidate(13, musicbook = false);
    		$$invalidate(14, corruptedspace = false);
    		$$invalidate(15, oilbuddies = false);
    		$$invalidate(17, plastica = false);
    		$$invalidate(18, familiarfaces = false);
    		$$invalidate(16, litabok = false);
    		$$invalidate(12, trash = false);
    		$$invalidate(19, likamar = false);
    		$$invalidate(20, oeb = false);
    		$$invalidate(21, beauimg = false);
    		$$invalidate(22, bread = false);
    		$$invalidate(23, flora = false);
    		$$invalidate(24, breadmag = false);
    		$$invalidate(25, evublad = true);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => $$invalidate(0, expand = !expand);
    	const click_handler_1 = () => $$invalidate(0, expand = !expand);
    	const click_handler_2 = () => $$invalidate(0, expand = !expand);
    	const click_handler_3 = () => $$invalidate(0, expand = !expand);
    	const click_handler_4 = () => $$invalidate(0, expand = !expand);
    	const click_handler_5 = () => $$invalidate(0, expand = !expand);
    	const click_handler_6 = () => $$invalidate(0, expand = !expand);
    	const click_handler_7 = () => $$invalidate(0, expand = !expand);
    	const click_handler_8 = () => $$invalidate(0, expand = !expand);
    	const click_handler_9 = () => $$invalidate(0, expand = !expand);
    	const click_handler_10 = () => $$invalidate(0, expand = !expand);
    	const click_handler_11 = () => $$invalidate(0, expand = !expand);
    	const click_handler_12 = () => $$invalidate(0, expand = !expand);
    	const click_handler_13 = () => $$invalidate(0, expand = !expand);
    	const click_handler_14 = () => $$invalidate(0, expand = !expand);
    	const click_handler_15 = () => $$invalidate(0, expand = !expand);
    	const click_handler_16 = () => $$invalidate(0, expand = !expand);
    	const click_handler_17 = () => $$invalidate(0, expand = !expand);
    	const click_handler_18 = () => $$invalidate(0, expand = !expand);
    	const click_handler_19 = () => $$invalidate(0, expand = !expand);
    	const click_handler_20 = () => $$invalidate(0, expand = !expand);
    	const click_handler_21 = () => $$invalidate(0, expand = !expand);
    	const click_handler_22 = () => $$invalidate(0, expand = !expand);
    	const click_handler_23 = () => $$invalidate(0, expand = !expand);
    	const click_handler_24 = () => $$invalidate(0, expand = !expand);

    	$$self.$capture_state = () => ({
    		Onourowntime,
    		Green,
    		Vivienne,
    		Portfolioio,
    		Typoposters,
    		Secret,
    		SortedPlastic: Sorted_plastic,
    		MusicPosters: Musicposters,
    		Timatal,
    		ToolsOfExpression,
    		Trash,
    		MusicBook,
    		Corrupted,
    		OilBuddies,
    		Litabok,
    		Plastica,
    		FamiliarFaces,
    		Likamar,
    		Oeb,
    		Beauimg,
    		Bread,
    		Flora,
    		Breadmag,
    		Evublad,
    		expand,
    		frontscreen,
    		other,
    		onourowntime,
    		green,
    		viv,
    		typoposters,
    		secret,
    		portfolioio,
    		sortedplastic,
    		musicposters,
    		timatal,
    		tools,
    		trash,
    		musicbook,
    		corruptedspace,
    		oilbuddies,
    		litabok,
    		plastica,
    		familiarfaces,
    		likamar,
    		oeb,
    		beauimg,
    		bread,
    		flora,
    		breadmag,
    		evublad,
    		toggleonourowntime,
    		togglegreen,
    		toggleviv,
    		toggleportfolioio,
    		toggletypoposters,
    		togglesecret,
    		togglesortedplastic,
    		togglemusicposters,
    		toggletimatal,
    		toggletools,
    		toggleplastica,
    		togglemusicbook,
    		togglecorruptedspace,
    		toggleoilbuddies,
    		togglefamiliarfaces,
    		togglelitabok,
    		toggletrash,
    		togglelikamar,
    		toggleoeb,
    		togglebeauimg,
    		togglebread,
    		toggleflora,
    		togglebreadmag,
    		toggleevublad
    	});

    	$$self.$inject_state = $$props => {
    		if ("expand" in $$props) $$invalidate(0, expand = $$props.expand);
    		if ("frontscreen" in $$props) $$invalidate(1, frontscreen = $$props.frontscreen);
    		if ("other" in $$props) $$invalidate(26, other = $$props.other);
    		if ("onourowntime" in $$props) $$invalidate(2, onourowntime = $$props.onourowntime);
    		if ("green" in $$props) $$invalidate(3, green = $$props.green);
    		if ("viv" in $$props) $$invalidate(4, viv = $$props.viv);
    		if ("typoposters" in $$props) $$invalidate(5, typoposters = $$props.typoposters);
    		if ("secret" in $$props) $$invalidate(6, secret = $$props.secret);
    		if ("portfolioio" in $$props) $$invalidate(7, portfolioio = $$props.portfolioio);
    		if ("sortedplastic" in $$props) $$invalidate(8, sortedplastic = $$props.sortedplastic);
    		if ("musicposters" in $$props) $$invalidate(9, musicposters = $$props.musicposters);
    		if ("timatal" in $$props) $$invalidate(10, timatal = $$props.timatal);
    		if ("tools" in $$props) $$invalidate(11, tools = $$props.tools);
    		if ("trash" in $$props) $$invalidate(12, trash = $$props.trash);
    		if ("musicbook" in $$props) $$invalidate(13, musicbook = $$props.musicbook);
    		if ("corruptedspace" in $$props) $$invalidate(14, corruptedspace = $$props.corruptedspace);
    		if ("oilbuddies" in $$props) $$invalidate(15, oilbuddies = $$props.oilbuddies);
    		if ("litabok" in $$props) $$invalidate(16, litabok = $$props.litabok);
    		if ("plastica" in $$props) $$invalidate(17, plastica = $$props.plastica);
    		if ("familiarfaces" in $$props) $$invalidate(18, familiarfaces = $$props.familiarfaces);
    		if ("likamar" in $$props) $$invalidate(19, likamar = $$props.likamar);
    		if ("oeb" in $$props) $$invalidate(20, oeb = $$props.oeb);
    		if ("beauimg" in $$props) $$invalidate(21, beauimg = $$props.beauimg);
    		if ("bread" in $$props) $$invalidate(22, bread = $$props.bread);
    		if ("flora" in $$props) $$invalidate(23, flora = $$props.flora);
    		if ("breadmag" in $$props) $$invalidate(24, breadmag = $$props.breadmag);
    		if ("evublad" in $$props) $$invalidate(25, evublad = $$props.evublad);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		expand,
    		frontscreen,
    		onourowntime,
    		green,
    		viv,
    		typoposters,
    		secret,
    		portfolioio,
    		sortedplastic,
    		musicposters,
    		timatal,
    		tools,
    		trash,
    		musicbook,
    		corruptedspace,
    		oilbuddies,
    		litabok,
    		plastica,
    		familiarfaces,
    		likamar,
    		oeb,
    		beauimg,
    		bread,
    		flora,
    		breadmag,
    		evublad,
    		other,
    		toggleonourowntime,
    		togglegreen,
    		toggleviv,
    		toggleportfolioio,
    		toggletypoposters,
    		togglesecret,
    		togglesortedplastic,
    		togglemusicposters,
    		toggletimatal,
    		toggletools,
    		toggleplastica,
    		togglemusicbook,
    		togglecorruptedspace,
    		toggleoilbuddies,
    		togglefamiliarfaces,
    		togglelitabok,
    		toggletrash,
    		togglelikamar,
    		toggleoeb,
    		togglebeauimg,
    		togglebread,
    		toggleflora,
    		togglebreadmag,
    		toggleevublad,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9,
    		click_handler_10,
    		click_handler_11,
    		click_handler_12,
    		click_handler_13,
    		click_handler_14,
    		click_handler_15,
    		click_handler_16,
    		click_handler_17,
    		click_handler_18,
    		click_handler_19,
    		click_handler_20,
    		click_handler_21,
    		click_handler_22,
    		click_handler_23,
    		click_handler_24
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {}, [-1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$o.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
