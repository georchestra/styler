/**
 * @requires OpenLayers/Handler/Path.js
 */

/**
 * Class: OpenLayers.Handler.CircleSegment
 * Handler to draw a circle while displaying the radius. 
 *
 * Inherits from:
 *  - <OpenLayers.Handler.Path>
 */
OpenLayers.Handler.CircleSegment = OpenLayers.Class(OpenLayers.Handler.Path, {

    /**
     * Property: origin
     * {<OpenLayers.Feature.Vector>} The origin of the segment, first clicked
     *     point
     */
    origin: null,

    /**
     * Property: circle
     * {<OpenLayers.Feature.Vector>} The drawn circle
     */
    circle: null,

    /**
     * Property: _drawing
     * {Boolean} Indicates if in the process of drawing a segment.
     *    (We prefix the variable name with an underscore not to
     *     collide with a "drawing" property of the parent.)
     */
    _drawing: false,

    /**
     * Constructor: OpenLayers.Handler.CircleSegment 
     */
    initialize: function(control, callbacks, options) {
        options = options || {};
        options.maxVertices = 2;
        options.persist = true;
        options.freehandToggle = null;
        OpenLayers.Handler.Path.prototype.initialize.apply(
            this, [control, callbacks, options]);
    },

    /**
     *
     */
    addPoint: function() {
        OpenLayers.Handler.Path.prototype.addPoint.apply(this, arguments);
        if (this.line.geometry.components.length == 2) {
            var feature = this.origin = new OpenLayers.Feature.Vector(
                this.line.geometry.components[0].clone());
            this.layer.addFeatures([feature], {silent: true});
            this._drawing = true;
        }
    },

    /**
     *
     */
    destroyPersistedFeature: function() {
        OpenLayers.Handler.Path.prototype.destroyPersistedFeature.apply(
            this, arguments);
        if (this.layer) {
            if (this.origin) {
                this.origin.destroy();
                this.origin = null;
            }
            if (this.circle) {
                this.circle.destroy();
                this.circle = null;
            }
        }
    },

    /**
     *
     */
    modifyFeature: function() {
        OpenLayers.Handler.Path.prototype.modifyFeature.apply(this, arguments);

        if (this._drawing) {
            if (this.circle) {
                this.layer.removeFeatures([this.circle, this.point]);
            }
            var geometry = OpenLayers.Geometry.Polygon.createRegularPolygon(
                this.origin.geometry, this.line.geometry.getLength(), 40
            );

            this.circle = new OpenLayers.Feature.Vector(geometry);
            if (!this.point.style){
                var style = OpenLayers.Util.applyDefaults(
                        this.defaultStyle, OpenLayers.Feature.Vector.style["default"]);
                this.point.style = style;
            }

            /** Display the radius **/
            var curLength = this.line.geometry.getLength();
            var label="";
            if (curLength>1000) {
                label = Math.round(curLength / 10) / 100 + " km ";
            } else {
                label = Math.round(curLength) + " m ";
            }
            this.layer.addFeatures([this.point], {silent: true});
            this.point.style.label = label;
            this.point.style.graphic = false;
            this.point.style.labelSelect = true;

            var o = this.origin.geometry,
                p = this.point.geometry,
                align,
                xOffset,
                yOffset;
            if (o.x < p.x) {
                align = 'l';
                xOffset = 10;
            } else {
                align = 'r';
                xOffset = -10;
            }

            if (o.y < p.y) {
                align += 'b';
                yOffset = 10;
            } else {
                align += 't';
                yOffset = -10;
            }
            this.point.style.labelAlign = align;
            this.point.style.labelXOffset = xOffset;
            this.point.style.labelYOffset = yOffset;

            this.layer.addFeatures([this.circle], {silent: true});
        }
    },

    /**
     *
     */
    deactivate: function() {
        if (OpenLayers.Handler.Path.prototype.deactivate.call(this)) {
            this._drawing = false;
            return true;
        }
        return false;
    },

    /**
     *
     */
    dblclick: function() {
        // we don't want double click
    },

    finalize: function(cancel) {
        var key = cancel ? "cancel" : "done";
        this.mouseDown = false;
        this.lastDown = null;
        this.lastUp = null;
        this.lastTouchPx = null;

        if (this.circle && this.circle.geometry) {
            this.callback(key, [this.circle.geometry.clone()]);
        }
        this.destroyFeature(cancel);
    }
});
