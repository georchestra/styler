/**
 * Copyright (c) 2008 The Open Planning Project
 */

/**
 * @include Styler/widgets/FilterPanel.js
 * @include Styler/widgets/SpatialFilterPanel.js
 * @include GeoExt/widgets/Action.js
 * @include Styler/widgets/CircleSegment.js
 * @include OpenLayers/Handler/RegularPolygon.js
 */

Ext.namespace("Styler");

Styler.FilterBuilder = Ext.extend(Ext.Panel, {

    /**
     * Property: builderTypeNames
     * {Array} A list of labels for that correspond to builder type constants.
     *     These will be the option names available in the builder type combo.
     *     Default is ["any", "all", "none", "not all"].
     */

    /**
     * Property: allowedBuilderTypes
     * {Array} List of builder type constants.  Default is
     *     [ANY_OF, ALL_OF, NONE_OF].
     */
    allowedBuilderTypes: null,

    /**
     * Property: filterPanelOptions
     * {Object} Allows customization of attributes comboBox
     */
    filterPanelOptions: null,

    rowHeight: 25,

    builderType: null,

    childFiltersPanel: null,

    customizeFilterOnInit: true,

    /**
     * Property: preComboText
     * {String} text displayed before combo.
     */

    /**
     * Property: postComboText
     * {String} text displayed after combo.
     */

     /**
      * Property: comboConfig
      * {Object} Additional config properties for the filter types combo
      */
    comboConfig: {},

    /**
     * Property: allowGroups
     * {Boolean} Allow groups of conditions to be added.  Default is true.
     *     If false, only individual conditions (non-logical filters) can
     *     be added.
     */
    allowGroups: true,

    /**
     * Property: allowSaveFilter
     * {Boolean} Show button to save and load filter
     */
    allowSaveFilter: false,

    /**
     * Property: geometryTypes
     * {Array} List all possible geometry types to search  with.
     */
    geometryTypes: [ 'polygon', 'circle', 'line', 'point' ],

    /**
     * Property: allowSpatial
     * {Boolean} Allow spatial conditions to be added.  Default is false.
     */
    allowSpatial: false,

    /**
     * Property: vectorLayer
     * {OpenLayers.Layer.Vector} The vector layer used to draw features
     *      If none is provided, it will be created.
     */
    vectorLayer: null,

    /**
     * Property: map
     * {OpenLayers.Map} The map object to which we add our vectorLayer
     *      required if allowSpatial is true.
     */
    map: null,

    /**
     * Property: cookieProvider
     * {Ext.state.CookieProvider} The cookie provider
     * Used for storing filters or geometries (if available) ...
     */
    cookieProvider: null,

    /**
     * Property: deactivable
     * {Boolean}
     */
    deactivable: false,

    /**
     * Property: bufferSupport
     */
    bufferSupport: false,

    /**
     * Property: toolbarType
     * {String} Place toolbar at the bottom with 'bbar' or
     *  at the 'top' with 'tbar'
     */
    toolbarType: 'bbar',

    /**
     * Property: noConditionOnInit
     * {Boolean}
     */
    noConditionOnInit: false,

    initComponent: function() {
        var defConfig = {
            builderTypeNames: [
                OpenLayers.i18n("any"),
                OpenLayers.i18n("all"),
                OpenLayers.i18n("none"),
                OpenLayers.i18n("not all")
            ],
            preComboText: OpenLayers.i18n("Matching"),
            postComboText: OpenLayers.i18n("these conditions:"),
            plain: true,
            layout: 'column',
            defaults: {
                columnWidth: 1
            },
            defaultBuilderType: Styler.FilterBuilder.ANY_OF
        };
        Ext.applyIf(this, defConfig);

        if(this.customizeFilterOnInit) {
            this.filter = this.customizeFilter(this.filter);
            if (this.noConditionOnInit) {
                var filters = this.filter.filters[0].filters;
                filters.remove(filters[0]);
            }
        }

        this.builderType = this.getBuilderType();

        this.items = [
            {
                xtype: "panel",
                height: 30,
                layout: 'fit',
                border: false,
                items: [{
                    xtype: "panel",
                    border: false,
                    layout: "column",
                    style: "margin-top: 0.25em;",
                    defaults: {
                        border: false
                    },
                    items: [{
                        html: this.preComboText,
                        cls: 'filterbuilder-text'
                    }, {
                        height: 25,
                        width: 85,
                        items: [this.createBuilderTypeCombo()]
                    }, {
                        html: this.postComboText,
                        cls: 'filterbuilder-text'
                    }]
                }]
            }, this.createChildFiltersPanel()
        ];

        this[this.toolbarType] = this.createToolBar();

        this.addEvents(
            /**
             * Event: change
             * Fires when the filter changes.
             *
             * Listener arguments:
             * builder - {Styler.FilterBuilder} This filter builder.  Call
             *     <getFilter> to get the updated filter.
             */
            "change",
            /**
             * Event: loading
             * Fires when loading data from server
             */
            "loading",
            /**
             * Event: loaded
             * Fires when finished loading data from server
             */
            "loaded"
        );

        Styler.FilterBuilder.superclass.initComponent.call(this);
    },

    deactivateControls: function() {
        var controls = this.controls, i;
        if (controls) {
            for (i=0,l=controls.length; i<l; i++) {
                controls[i].deactivate();
            }
        }
    },

    setUp: function() {
        if (this.vectorLayer) {
            this.vectorLayer.setVisibility(true);
        }
    },

    tearDown: function() {
        this.deactivateControls();
        if (this.vectorLayer) {
            this.vectorLayer.setVisibility(false);
        }
    },

    /**
     * Method: createToolBar
     */
    createToolBar: function() {
        var bar = [{
            text: OpenLayers.i18n("Condition"),
            iconCls: "add",
            handler: function() {
                this.addCondition();
            },
            scope: this
        }];
        if(this.allowSpatial) {
            this.controls = [];
            var layer = this.createVectorLayer();
            bar.push({
                text: OpenLayers.i18n("Spatial condition"),
                iconCls: "add",
                menu: this.createEditingMenu(layer),
                scope: this
            });
            this.vectorLayer = layer;

            // register to events modifying panel's visibility
            // so that we hide our vectorLayer when not visible
            // accordion
            this.on('expand', this.setUp, this);
            this.on('collapse', this.tearDown, this);
            // tabs
            this.on('activate', this.setUp, this);
            this.on('deactivate', this.tearDown, this);
            // manual enable/disable
            this.on('enable', this.setUp, this);
            this.on('disable', this.tearDown, this);
            // for card layouts, we have no event to listen to !
        }
        if(this.allowGroups) {
            bar.push({
                text: OpenLayers.i18n("Group"),
                iconCls: "add",
                handler: function() {
                    this.addCondition('group');
                },
                scope: this
            });
        }
        if(this.allowSaveFilter) {
            bar.push({
                text: OpenLayers.i18n("Save filters"),
                iconCls: "savegeometry",
                handler: this.saveFilters,
                scope: this
            });
            bar.push({
                text: OpenLayers.i18n("Load filters"),
                iconCls: "add",
                handler: this.loadFilters,
                scope: this
            });

        }
        return bar;
    },

    /**
     * Method: createEditingMenu
     */
    createEditingMenu: function(layer) {
        var createDrawControl = function(handler, controls) {
            var options = {};
            if (handler === OpenLayers.Handler.RegularPolygon) {
                options.sides = 40;
            }
            var control = new OpenLayers.Control.DrawFeature(layer, handler, {
                handlerOptions: options
            });
            control.events.on({
                "activate": function() {
                    OpenLayers.Element.addClass(this.map.viewPortDiv, "olDrawBox");
                },
                "deactivate": function() {
                    OpenLayers.Element.removeClass(this.map.viewPortDiv, "olDrawBox");
                },
                scope: this
            });
            controls.push(control);
            return control;
        };
        var items = [];
        if (this.geometryTypes.indexOf('point')>-1) {
            items.push(new Ext.menu.CheckItem(new GeoExt.Action({
                control: createDrawControl.call(this, OpenLayers.Handler.Point, this.controls),
                map: this.map,
                group: "querier",
                text: OpenLayers.i18n("based on a point"),
                iconCls: "point"
            })));
        }
        if (this.geometryTypes.indexOf('line')>-1) {
            items.push(new Ext.menu.CheckItem(new GeoExt.Action({
                control: createDrawControl.call(this, OpenLayers.Handler.Path, this.controls),
                map: this.map,
                group: "querier",
                text: OpenLayers.i18n("based on a line"),
                iconCls: "linestring"
            })));
        }
        if (this.geometryTypes.indexOf('circle')>-1 && !!OpenLayers.Handler.CircleSegment) {
            items.push(new Ext.menu.CheckItem(new GeoExt.Action({
                control: createDrawControl.call(this, OpenLayers.Handler.CircleSegment, this.controls),
                map: this.map,
                group: "querier",
                text: OpenLayers.i18n("based on a circle"),
                iconCls: "circle"
            })));
        }
        if (this.geometryTypes.indexOf('polygon')>-1) {
            items.push(new Ext.menu.CheckItem(new GeoExt.Action({
                control: createDrawControl.call(this, OpenLayers.Handler.Polygon, this.controls),
                map: this.map,
                group: "querier",
                text: OpenLayers.i18n("based on a polygon"),
                iconCls: "polygon"
            })));
        }
        if (this.cookieProvider && OpenLayers.Format && OpenLayers.Format.WKT) {
            var item = new Ext.menu.CheckItem({
                text: OpenLayers.i18n("based on a stored geometry"),
                disabled: !this.cookieProvider.get('geometry', false),
                handler: function() {
                    var wkt = this.cookieProvider.decodeValue(
                        this.cookieProvider.get('geometry')
                    );
                    this.vectorLayer.addFeatures([
                        (new OpenLayers.Format.WKT()).read(wkt)
                    ]);
                },
                scope: this,
                iconCls: "database"
            });
            this.cookieProvider.on('statechange', function(cp, key, value){
                if (key === 'geometry') {
                    if (value.length) {
                        item.enable();
                    } else {
                        item.disable();
                    }
                }
            }, this);
            items.push(item);
        }
        return new Ext.menu.Menu({items: items});
    },

    /**
     * APIMethod: getFilter
     * Returns a filter that fits the model in the Filter Encoding
     *     specification.  Use this method instead of directly accessing
     *     the <filter> property.
     *
     * Returns:
     * {OpenLayers.Filter} A filter that can be serialized with the filter
     *     format.
     */
    getFilter: function() {
        var filter;
        if(this.filter) {
            filter = this.removeUnchecked(this.cloneFilter(this.filter));

            // Transform contains to like
            function filtersContainsToLike(filt) {
                Ext.each(filt.filters, function(f) {
                    if (f.filters) {
                        filtersContainsToLike(f)
                    }
                    else {
                        if (f.type == Styler.FilterPanel.CONTAINS) {
                            f.type = OpenLayers.Filter.Comparison.LIKE
                            f.value = "*" + f.value + "*"
                        }
                    }
                })
            }
            filtersContainsToLike(filter);

            if(filter instanceof OpenLayers.Filter.Logical) {
                filter = this.cleanFilter(filter);
            }
        }
        return filter;
    },

    /**
     * Method: cloneFilter
     * A special cloning method which takes care of the "removed" property
     *
     * Parameters:
     * f - {OpenLayers.Filter} A filter.
     *
     * Returns:
     * {OpenLayers.Filter} A filter
     */
    cloneFilter: function(f) {
        var filter;
        if(f instanceof OpenLayers.Filter.Logical) {
            var filters = [], i;
            for(var i=0, len=f.filters.length; i<len; ++i) {
                filters.push(this.cloneFilter(f.filters[i]));
            }
            filter = new OpenLayers.Filter.Logical({
                type: f.type,
                filters: filters
            });
            if (f.removed === true) {
                filter.removed = true;
            }
        }  else {
            filter = f.clone();
        }
        return filter;
    },

    /**
     * Method: removeUnchecked
     * Returns a filter containing only those which have been checked
     *
     * Parameters:
     * filter - {OpenLayers.Filter} A filter.
     *
     * Returns:
     * {OpenLayers.Filter} A filter
     */
    removeUnchecked: function(filter) {
        if(filter instanceof OpenLayers.Filter.Logical) {
            var toDelete = [];
            var filters = filter.filters;
            for (var i = 0, l = filters.length; i<l; i++) {
                if (filters[i].removed === true) {
                    toDelete.push(filters[i]);
                } else {
                    filters[i] = this.removeUnchecked(filters[i]);
                }
            }
            for (var j = 0, ll = toDelete.length; j<ll; j++) {
                OpenLayers.Util.removeItem(filters, toDelete[j]);
            }
        }
        return filter;
    },

    /**
     * Method: cleanFilter
     * Ensures that binary logical filters have more than one child.
     *
     * Parameters:
     * filter - {OpenLayers.Filter.Logical} A logical filter.
     *
     * Returns:
     * {OpenLayers.Filter} An equivalent filter to the input, where all
     *     binary logical filters have more than one child filter.
     */
    cleanFilter: function(filter) {
        if(filter instanceof OpenLayers.Filter.Logical) {
            if(filter.type !== OpenLayers.Filter.Logical.NOT &&
               filter.filters.length === 1) {
                filter = this.cleanFilter(filter.filters[0]);
            } else {
                var child;
                for(var i=0, len=filter.filters.length; i<len; ++i) {
                    child = filter.filters[i];
                    if(child instanceof OpenLayers.Filter.Logical) {
                        filter.filters[i] = this.cleanFilter(child);
                    }
                }
            }
        }
        return filter;
    },

    /**
     * Method: customizeFilter
     * Create a filter that fits the model for this filter builder.  This filter
     *     will not necessarily meet the Filter Encoding specification.  In
     *     particular, filters representing binary logical operators may not
     *     have two child filters.  Use the <getFilter> method to return a
     *     filter that meets the encoding spec.
     *
     * Parameters:
     * filter - {OpenLayers.Filter} The input filter.  This filter will not
     *     be modified.  Register for events to receive an updated filter, or
     *     call <getFilter>.
     *
     * Returns:
     * {OpenLayers.Filter} A filter that fits the model used by this builder.
     */
    customizeFilter: function(filter) {
		var child;
        if(!filter) {
            filter = this.wrapFilter(this.createDefaultFilter());
        } else {  // TODO: spatial case ...
            filter = this.cleanFilter(filter);
            switch(filter.type) {
                case OpenLayers.Filter.Logical.AND:
                case OpenLayers.Filter.Logical.OR:
                    if(!filter.filters || filter.filters.length === 0) {
                        // give the filter children if it has none
                        filter.filters = [this.createDefaultFilter()];
                    } else {
                        for(var i=0, len=filter.filters.length; i<len; ++i) {
                            child = filter.filters[i];
                            if(child instanceof OpenLayers.Filter.Logical) {
                                filter.filters[i] = this.customizeFilter(child);
                            }
                        }
                    }
                    // wrap in a logical OR
                    filter = new OpenLayers.Filter.Logical({
                        type: OpenLayers.Filter.Logical.OR,
                        filters: [filter]
                    });
                    break;
                case OpenLayers.Filter.Logical.NOT:
                    if(!filter.filters || filter.filters.length === 0) {
                        filter.filters = [
                            new OpenLayers.Filter.Logical({
                                type: OpenLayers.Filter.Logical.OR,
                                filters: [this.createDefaultFilter()]
                            })
                        ];
                    } else {
                        // NOT filters should have one child only
                        child = filter.filters[0];
                        if(child instanceof OpenLayers.Filter.Logical) {
                            if(child.type !== OpenLayers.Filter.Logical.NOT) {
                                // check children of AND and OR
                                var grandchild;
                                for(var i=0, len=child.filters.length; i<len; ++i) {
                                    grandchild = child.filters[i];
                                    if(grandchild instanceof OpenLayers.Filter.Logical) {
                                        child.filters[i] = this.customizeFilter(grandchild);
                                    }
                                }
                            } else {
                                // silly double negative
                                if(child.filters && child.filters.length > 0) {
                                    filter = this.customizeFilter(child.filters[0]);
                                } else {
                                    filter = this.wrapFilter(this.createDefaultFilter());
                                }
                            }
                        } else {
                            // non-logical child of NOT should be wrapped
                            var type;
                            if(this.defaultBuilderType === Styler.FilterBuilder.NOT_ALL_OF) {
                                type = OpenLayers.Logical.Filter.AND;
                            } else {
                                type = OpenLayers.Logical.Filter.OR;
                            }
                            filter.filters = [
                                new OpenLayers.Filter.Logical({
                                    type: type,
                                    filters: [child]
                                })
                            ];
                        }
                    }
                    break;
                case OpenLayers.Filter.Comparison.BETWEEN:
                    filter = new OpenLayers.Filter.Logical({
                        type: OpenLayers.Filter.Logical.AND,
                        filters: [
                            new OpenLayers.Filter.Comparison({
                                type: OpenLayers.Filter.Comparison.GREATER_THAN_OR_EQUAL_TO,
                                property: filter.property,
                                value: filter.lowerBoundary
                            }),
                            new OpenLayers.Filter.Comparison({
                                type: OpenLayers.Filter.Comparison.LESS_THAN_OR_EQUAL_TO,
                                property: filter.property,
                                value: filter.upperBoundary
                            })
                        ]
                    });
                    filter = this.customizeFilter(filter);
                    break;
                default:
                    // non-logical filters get wrapped
                    filter = this.wrapFilter(filter);
            }
        }
        return filter;
    },

    createDefaultFilter: function(feature) {
        if(feature instanceof OpenLayers.Feature.Vector) {
            return new OpenLayers.Filter.Spatial({
                value: feature.geometry,
                projection: this.map.getProjection(),
                type: OpenLayers.Filter.Spatial.INTERSECTS
            });
        } else {
            return new OpenLayers.Filter.Comparison();
        }
    },

    /**
     * Method: createVectorLayer
     *
     * Returns:
     * {OpenLayers.Layer.Vector}
     */
    createVectorLayer: function() {
        var layer = (this.vectorLayer) ?
            this.vectorLayer : new OpenLayers.Layer.Vector('filter_builder', {
                displayInLayerSwitcher: false
            });
        if(OpenLayers.Util.indexOf(this.map.layers, layer) < 0) {
            this.map.addLayer(layer);
        }
        // each time a new feature is added, a new spatial condition is added.
        layer.events.on({
            "featureadded": function(options) {
                this.addCondition("spatial", options.feature);
                this.deactivateControls();
            },
            scope: this
        });
        return layer;
    },

    /**
     * Method: wrapFilter
     * Given a non-logical filter, this creates parent filters depending on
     *     the <defaultBuilderType>.
     *
     * Parameters:
     * filter - {OpenLayers.Filter} A non-logical filter.
     *
     * Returns:
     * {OpenLayers.Filter} A wrapped version of the input filter.
     */
    wrapFilter: function(filter) {
        var type;
        if(this.defaultBuilderType === Styler.FilterBuilder.ALL_OF) {
            type = OpenLayers.Filter.Logical.AND;
        } else {
            type = OpenLayers.Filter.Logical.OR;
        }
        return new OpenLayers.Filter.Logical({
            type: OpenLayers.Filter.Logical.OR,
            filters: [
                new OpenLayers.Filter.Logical({
                    type: type, filters: [filter]
                })
            ]
        });
    },

    /**
     * Method: addCondition
     * Add a new condition or group of conditions to the builder.  This
     *     modifies the filter and adds a panel representing the new condition
     *     or group of conditions.
     */
    addCondition: function(conditionType, feature, filter) {
        filter = filter || null;
        var type;

        var cfg = {
            filterbuilder: this,
            customizeFilterOnInit: (conditionType === "group") && false,
            listeners: {
                "change": function() {
                    this.fireEvent("change", this);
                },
                "loaded": function() {
                    this.fireEvent("loaded");
                },
                "loading": function() {
                    this.fireEvent("loading");
                },
                scope: this
            }
        };

        switch (conditionType) {
        case "group":
            if (!filter) {
                filter = this.wrapFilter(this.createDefaultFilter());
            }
            Ext.apply(cfg, {
                xtype: "gx_filterbuilder",
                filter: filter,
                deactivable: this.deactivable,
                filterPanelOptions: Ext.apply({}, this.filterPanelOptions),
                attributes: this.attributes
            });
            break;
        case "spatial":
            if (!filter) {
                filter = this.createDefaultFilter(feature);
            }
            Ext.apply(cfg, {
                xtype: "gx_spatialfilterpanel",
                filter: filter,
                cookieProvider: this.cookieProvider,
                feature: feature,
                toggleGroup: "querier",
                map: this.map
            });
            break;
        default:
            if (!filter) {
                filter = this.createDefaultFilter();
            }
            Ext.apply(cfg, {
                xtype: "gx_filterpanel",
                filter: filter,
                attributes: this.attributes,
                filterPanelOptions: Ext.apply({}, this.filterPanelOptions)
            });
        }
        var newChild = this.newRow(cfg);
        this.childFiltersPanel.add(newChild);
        this.filter.filters[0].filters.push(filter);
        this.childFiltersPanel.doLayout();
    },

    /**
     * Method: removeCondition
     * Remove a condition or group of conditions from the builder.  This
     *     modifies the filter and removes the panel representing the condition
     *     or group of conditions.
     */
    removeCondition: function(panel, filter) {
        var parent = this.filter.filters[0].filters;
        if(parent.length >= 1) {
            parent.remove(filter);
            panel.getComponent(1).getComponent(0).tearDown();
            this.childFiltersPanel.remove(panel);
        }
        this.fireEvent("change", this);
    },

    createBuilderTypeCombo: function() {
        var types = this.allowedBuilderTypes || [
            Styler.FilterBuilder.ANY_OF, Styler.FilterBuilder.ALL_OF,
            Styler.FilterBuilder.NONE_OF
        ];
        var numTypes = types.length;
        var data = new Array(numTypes), type;
        for(var i=0; i<numTypes; ++i) {
            type = types[i];
            data[i] = [type, this.builderTypeNames[type]];
        }
        return Ext.apply({
            xtype: "combo",
            store: new Ext.data.SimpleStore({
                data: data,
                fields: ["value", "name"]
            }),
            value: this.builderType,
            displayField: "name",
            valueField: "value",
            triggerAction: "all",
            mode: "local",
            listeners: {
                select: function(combo, record) {
                    this.changeBuilderType(record.get("value"));
                    this.fireEvent("change", this);
                },
                scope: this
            },
            width: 80
        }, this.comboConfig);
    },

    /**
     * Method: changeBuilderType
     * Alter the filter types when the filter type combo changes.
     *
     * Parameters:
     * type - {Integer} One of the filter type constants.
     */
    changeBuilderType: function(type) {
        if(type !== this.builderType) {
            this.builderType = type;
            var child = this.filter.filters[0];
            switch(type) {
                case Styler.FilterBuilder.ANY_OF:
                    this.filter.type = OpenLayers.Filter.Logical.OR;
                    child.type = OpenLayers.Filter.Logical.OR;
                    break;
                case Styler.FilterBuilder.ALL_OF:
                    this.filter.type = OpenLayers.Filter.Logical.OR;
                    child.type = OpenLayers.Filter.Logical.AND;
                    break;
                case Styler.FilterBuilder.NONE_OF:
                    this.filter.type = OpenLayers.Filter.Logical.NOT;
                    child.type = OpenLayers.Filter.Logical.OR;
                    break;
                case Styler.FilterBuilder.NOT_ALL_OF:
                    this.filter.type = OpenLayers.Filter.Logical.NOT;
                    child.type = OpenLayers.Filter.Logical.AND;
                    break;
            }
        }
    },

    /**
     * Method: createChildFiltersPanel
     * Create the panel that holds all conditions and condition groups.  Since
     *     this is called after this filter has been customized, we always
     *     have a logical filter with one child filter - that child is also
     *     a logical filter.
     *
     * Returns:
     * {Ext.Panel} A child filters panel.
     */
    createChildFiltersPanel: function() {
        this.childFiltersPanel = new Ext.Panel({
            border: false,
            layout: 'column',
            bufferResize: true,
            defaults: {
                border: false,
                columnWidth: 1
            }
        });
        var grandchildren = this.filter.filters[0].filters;
        var grandchild;
        for(var i=0, len=grandchildren.length; i<len; ++i) {
            grandchild = grandchildren[i];
            this.childFiltersPanel.add(this.newRow({
                xtype: (grandchild instanceof OpenLayers.Filter.Logical) ?
                    "gx_filterbuilder" : "gx_filterpanel",
                filter: grandchild,
                attributes: this.attributes,
                deactivable: this.deactivable,
                filterPanelOptions: Ext.apply({}, this.filterPanelOptions),
                listeners: {
                    "change": function() {
                        this.fireEvent("change", this);
                    },
                    "loading": function() {
                        this.fireEvent("loading");
                    },
                    "loaded": function() {
                        this.fireEvent("loaded");
                    },
                    scope: this
                }
            }));
        }
        return this.childFiltersPanel;
    },

    /**
     * Method: newRow
     * Generate a "row" for the child filters panel.  This couples another
     *     filter panel or filter builder with a component that allows for
     *     condition removal.
     *
     * Returns:
     * {Ext.Panel} A panel that serves as a row in a child filters panel.
     */
    newRow: function(filterPanel) {
        var panel;
        var firstItems = [{
            border: false,
            bodyStyle: "padding-left: 0.25em;",
            items: [{
                xtype: "button",
                tooltip: OpenLayers.i18n("Delete this condition"),
                cls: 'x-btn-icon',
                iconCls: "delete",
                handler: function() {
                    this.removeCondition(panel, filterPanel.filter);
                },
                scope: this
            }]
        }];

        if (this.deactivable) {
            var checkbox = new Ext.form.Checkbox({
                checked: true
            });
            checkbox.on('check', function(cb, checked){
                filterPanel.filter.removed = !checked;
                this.fireEvent("change", filterPanel.filter);
            }, this);
            firstItems.push({
                bodyStyle: "padding: 0 5px;",
                border: false,
                items: [ checkbox ]
            });
        }

        panel = new Ext.Panel({
            layout: "column",
            defaults: {border: false},
            listeners: {
                'resize': function() {
                    this.doLayout();
                }
            },
            //style: "padding: 0.25em 0.5em;", // nice look in FF but not in IE
            style: "padding: 0.25em 0;",
            items: [{
                border: false,
                width: 60,
                layout: 'column',
                defaults: {
                    columnWidth: 0.5
                },
                items: firstItems
            }, {
                items: [filterPanel],
                border: false,
                columnWidth: 1
            }]
        });

        return panel;
    },

    /**
     * Method: getBuilderType
     * Determine the builder type based on this filter.
     *
     * Returns:
     * {Integer} One of the builder type constants.
     */
    getBuilderType: function() {
        var type = this.defaultBuilderType;
        if(this.filter) {
            var child = this.filter.filters[0];
            if(this.filter.type === OpenLayers.Filter.Logical.NOT) {
                switch(child.type) {
                    case OpenLayers.Filter.Logical.OR:
                        type = Styler.FilterBuilder.NONE_OF;
                        break;
                    case OpenLayers.Filter.Logical.AND:
                        type = Styler.FilterBuilder.NOT_ALL_OF;
                        break;
                }
            } else {
                switch(child.type) {
                    case OpenLayers.Filter.Logical.OR:
                        type = Styler.FilterBuilder.ANY_OF;
                        break;
                    case OpenLayers.Filter.Logical.AND:
                        type = Styler.FilterBuilder.ALL_OF;
                        break;
                }
            }
        }
        return type;
    },

    /**
     * Method: saveFilters
     * Save filter to file
     *
     * Returns:
     * {Boolean} True is save is successful
     */
    saveFilters: function() {
        var filterFormat = new OpenLayers.Format.Filter.v2_0_0(),
            xmlFormat = new OpenLayers.Format.XML();
        OpenLayers.Request.POST({
           url: GEOR.config.PATHNAME + "/ws/fe/",
           data: xmlFormat.write(filterFormat.write(this.getFilter())),
           success: function(response) {
               var o = Ext.decode(response.responseText);
               window.location.href = GEOR.config.PATHNAME + "/" + o.filepath;
           }
        });
     },

    /**
     * Method: loadFilters
     * Load filters from local file
     *
     */
    loadFilters: function() {
        var fetchAndRestoreFilter = function (filterURI, filterBuilder) {
            OpenLayers.Request.GET({
                url:filterURI,
                failure: function() {
                    GEOR.util.errorDialog({
                        msg: tr("Cannot access XML filters")
                    });
                },
                success: function(response) {
                    var filterString = response.responseText;
                    var fx = new OpenLayers.Format.XML(),
                        ff = new OpenLayers.Format.Filter.v2_0_0();
                    var loadedFilters = ff.readChildNodes(fx.read(filterString));
                    var clonedFilters = filterBuilder.cloneFilter(loadedFilters.filter);
                    if (clonedFilters.type == "&&") {
                        filterBuilder.filterBuilder.findByType('combo')[0].setValue(Styler.FilterBuilder.ALL_OF);
                        filterBuilder.changeBuilderType(Styler.FilterBuilder.ALL_OF);
                    } else if (clonedFilters.type == "||") {
                        filterBuilder.filterBuilder.findByType('combo')[0].setValue(Styler.FilterBuilder.ANY_OF);
                        filterBuilder.changeBuilderType(Styler.FilterBuilder.ANY_OF);
                    } else if (clonedFilters.type == "!") {
                        filterBuilder.filterBuilder.findByType('combo')[0].setValue(Styler.FilterBuilder.NONE_OF);
                        filterBuilder.changeBuilderType(Styler.FilterBuilder.NONE_OF);
                    }
                    Ext.each(clonedFilters.filters, function(filter) {
                        if (filter instanceof OpenLayers.Filter.Spatial) {
                            var feature = new OpenLayers.Feature.Vector(
                                filter.value, {}, this.vectorLayer.style);
                            //Adding a feature to vectorLayer fire an addCondition
                            //without the filter parameter
                            //We manually remove the filter
                            //and the row
                            this.vectorLayer.addFeatures([feature]);
                            this.childFiltersPanel.remove(
                                this.childFiltersPanel.items.items[
                                    this.childFiltersPanel.items.items.length-1
                                    ].getId());
                            this.filter.filters[0].filters.pop();
                            this.addCondition("spatial", feature, filter);
                        } else if (filter instanceof OpenLayers.Filter.Comparison) {
                            this.addCondition("default", null, filter)
                        }
                    }, filterBuilder);
                }
            });
        };

        var win = Ext.apply(new Ext.Window({
            xtype: 'window',
            title: OpenLayers.i18n("Upload filters..."),
            constrainHeader: true,
            layout: 'fit',
            width: 420,
            minWidth: 360,
            height: 200,
            closeAction: 'hide',
            modal: false,
            items: [
                {
                    xtype: 'form',
                    region: "north",
                    standardSubmit: false,
                    fileUpload: true,
                    bodyStyle: 'padding:10px',
                    labelWidth: 60,
                    height: 50,
                    monitorValid: true,
                    buttonAlign: 'right',
                    items: [
                        {
                            xtype: 'panel',
                            html: '<p>' + tr("Select filter encoding XML file") + '</p>',
                            border: false,
                            padding: 15
                        },
                        {
                            xtype: 'textfield',
                            inputType: 'file',
                            name: 'file',
                            labelSeparator: tr("labelSeparator"),
                            fieldLabel: tr("File"),
                            allowBlank: false,
                            blankText: tr("The file is required.")
                        },
                    ],
                    buttons: [
                        {
                            text: 'Load',
                            handler: function () {
                                var form = this.findParentByType('form').getForm();
                                if (form.isValid()) {
                                    form.submit({
                                        url: GEOR.config.PATHNAME + "/ws/fe/",
                                        success: function(form, action) {
                                            var o = Ext.decode(action.response.responseText);
                                            fetchAndRestoreFilter( GEOR.config.PATHNAME + "/" + o.filepath,
                                                this.findParentByType('window').filterBuilder);
                                            this.findParentByType('window').close();
                                        },
                                        failure: function(form, action) {
                                            GEOR.util.errorDialog({
                                                msg: tr("Cannot upload XML filters")
                                            });
                                        },
                                        scope: this
                                    });
                                } else {
                                    GEOR.util.errorDialog({
                                        msg: tr("Please check highlighted field")
                                        });
                                }
                            }
                        }
                    ]
                }
            ],
            buttons: [
                {
                    text: OpenLayers.i18n("Close"),
                    handler: function() {
                        win.hide();
                    }
                }
            ]
        }), {filterBuilder: this});
        win.show();
     }
});

/**
 * Builder Types
 */
Styler.FilterBuilder.ANY_OF = 0;
Styler.FilterBuilder.ALL_OF = 1;
Styler.FilterBuilder.NONE_OF = 2;
Styler.FilterBuilder.NOT_ALL_OF = 3;

Ext.reg('gx_filterbuilder', Styler.FilterBuilder);
