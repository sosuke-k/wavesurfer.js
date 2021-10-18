/**
 * @typedef {Object} GeckoPluginParams
 * @property {string|HTMLElement} container CSS selector or HTML element where
 * the Gecko information should be rendered.
 * @property {string} url The location of Gecko JSON data
 * @property {?boolean} deferInit Set to true to manually call
 * @property {?Object} monologues If set only shows the data monologues in this map.
 */

/**
 * Downloads and renders Gecko JSON audio transcription documents alongside the
 * waveform.
 *
 * @implements {PluginClass}
 * @extends {Observer}
 * @example
 * // if you are using <script> tags
 * var GeckoPlugin = window.WaveSurfer.gecko;
 *
 * // ... initialising wavesurfer with the plugin
 * var wavesurfer = WaveSurfer.create({
 *   // wavesurfer options ...
 *   plugins: [
 *     GeckoPlugin.create({
 *       // plugin options ...
 *     })
 *   ]
 * });
 */
export default class GeckoPlugin {
    /**
     * Gecko plugin definition factory
     *
     * This function must be used to create a plugin definition which can be
     * used by wavesurfer to correctly instantiate the plugin.
     *
     * @param  {GeckoPluginParams} params parameters use to initialise the plugin
     * @return {PluginDefinition} an object representing the plugin
     */
    static create(params) {
        return {
            name: "gecko",
            deferInit: params && params.deferInit ? params.deferInit : false,
            params: params,
            instance: GeckoPlugin,
        };
    }

    constructor(params, ws) {
        this.data = null;
        this.params = params;
        this.container =
            "string" == typeof params.container
                ? document.querySelector(params.container)
                : params.container;

        if (!this.container) {
            throw Error("No container for Gecko");
        }
    }

    init() {
        const _map = Array.prototype.map;

        this.data = {
            media: {},
            annotations: [],
        };

        if (this.params.url) {
            fetch(this.params.url).then((data) => {
                data.json().then((jsondata) => {
                    // TODO: Check keys
                    const monologues = jsondata["monologues"];
                    const annotations = _map.call(monologues, (mono, index) => {
                        const anno = {
                            id: index,
                            start: mono.start,
                            end: mono.end,
                            text: mono.terms[0].text,
                        };
                        return anno;
                    });
                    this.render(annotations);
                    this.data.annotations = annotations;
                    this.bindClick();
                    this.fireEvent("ready", this.data);
                });
            });
        }
    }

    destroy() {
        this.container.removeEventListener("click", this._onClick);
        this.container.removeChild(this.table);
    }

    render(annotations) {
        // table
        const table = (this.table = document.createElement("table"));
        table.className = "wavesurfer-annotations";

        // head
        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        thead.appendChild(headRow);
        table.appendChild(thead);
        const timeTh = document.createElement("th");
        timeTh.textContent = "Time";
        timeTh.className = "wavesurfer-time";
        headRow.appendChild(timeTh);

        const textTh = document.createElement("th");
        textTh.className = "wavesurfer-tier-";
        textTh.textContent = "Text";
        headRow.appendChild(textTh);

        // body
        const tbody = document.createElement("tbody");
        table.appendChild(tbody);
        annotations.forEach((anno) => {
            const row = document.createElement("tr");
            row.id = "wavesurfer-annotation-" + anno.id;
            tbody.appendChild(row);

            const timeTd = document.createElement("td");
            timeTd.className = "wavesurfer-time";
            timeTd.textContent =
                anno.start.toFixed(1) + "–" + anno.end.toFixed(1);
            row.appendChild(timeTd);

            const textTd = document.createElement("td");
            textTd.id = "wavesurfer-text-" + anno.id;
            textTd.dataset.ref = anno.id;
            textTd.dataset.start = anno.start;
            textTd.dataset.end = anno.end;
            textTd.textContent = anno.text;
            textTd.className = "wavesurfer-tier-";
            row.appendChild(textTd);
        });

        // add
        this.container.innerHTML = "";
        this.container.appendChild(table);
    }

    bindClick() {
        this._onClick = (e) => {
            const ref = e.target.dataset.ref;
            if (null != ref) {
                const index = parseInt(ref);
                const annot = this.data.annotations[index];
                if (annot) {
                    this.fireEvent("select", annot.start, annot.end);
                }
            }
        };
        this.container.addEventListener("click", this._onClick);
    }

    getRenderedAnnotation(time) {
        let result;
        this.data.annotations.some((annotation) => {
            if (annotation.start <= time && annotation.end >= time) {
                result = annotation;
                return true;
            }
            return false;
        });
        return result;
    }

    getAnnotationNode(annotation) {
        return document.getElementById(
            "wavesurfer-annotation-" + annotation.id
        );
    }
}
