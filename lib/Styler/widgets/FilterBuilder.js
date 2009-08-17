/**
 * Copyright (c) 2008 The Open Planning Project
 */

/**
 * @include Styler/widgets/FilterPanel.js
 * @include Styler/widgets/SpatialFilterPanel.js
 */

Ext.namespace("Styler");

Styler.FilterBuilder = Ext.extend(Ext.Panel, {

    /**
     * Property: builderTypeNames
     * {Array} A list of labels for that correspond to builder type constants.
     *     These will be the option names available in the builder type combo.
     *     Default is ["any", "all", "none", "not all"].
     */
    builderTypeNames: ["une de", "toutes", "aucune de", "pas toutes"],
    
    /**
     * Property: allowedBuilderTypes
     * {Array} List of builder type constants.  Default is
     *     [ANY_OF, ALL_OF, NONE_OF].
     */
    allowedBuilderTypes: null,
    
    rowHeight: 25,

    builderType: null,

    childFiltersPanel: null,
    
    customizeFilterOnInit: true,
    
    preComboText: "Correspondre à",
    postComboText: "ces conditions :",
    
    /**
     * Property: allowGroups
     * {Boolean} Allow groups of conditions to be added.  Default is true.
     *     If false, only individual conditions (non-logical filters) can
     *     be added.
     */
    allowGroups: true,
    
    /**
     * Property: allowSpatial
     * {Boolean} Allow spatial conditions to be added.  Default is true.
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
     *      required if allowSpatial is true (which is default)
     */
    map: null,

    initComponent: function() {
        var defConfig = {
            plain: true,
            border: false,
            defaultBuilderType: Styler.FilterBuilder.ANY_OF
        };
        Ext.applyIf(this, defConfig);
        
        if(this.customizeFilterOnInit) {
            this.filter = this.customizeFilter(this.filter);
        }
        
        this.builderType = this.getBuilderType();
        
        this.items = [
            {
                xtype: "panel",
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
                        cls: "x-form-item",
                        style: "padding: 0.3em 0.5em 0;" // TODO: replace with css
                    }, {
                        items: [this.createBuilderTypeCombo()]
                    }, {
                        html: this.postComboText,
                        cls: "x-form-item",
                        style: "padding: 0.3em 0.5em 0;" // TODO: replace with css
                    }]
                }]
            }, this.createChildFiltersPanel()
        ];
        
        this.bbar = this.createToolBar();
        
        if (this.allowSpatial) {
            this.controls = [];
            var layer = this.createVectorLayer();
            this.tbar = this.createEditionToolBar(layer);
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
        
        this.addEvents(
            /**
             * Event: change
             * Fires when the filter changes.
             *
             * Listener arguments:
             * builder - {Styler.FilterBuilder} This filter builder.  Call
             *     <getFilter> to get the updated filter.
             */
            "change"
        ); 

        Styler.FilterBuilder.superclass.initComponent.call(this);
    },
    
    deactivateControls: function() {
        var controls = this.controls;
        for (var i=0,l=controls.length; i<l; i++) {
            controls[i].deactivate();
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
            text: "ajouter une condition",
            iconCls: "add",
            handler: function() {
                this.addCondition();
            },
            scope: this
        }];
        if(this.allowGroups) {
            bar.push({
                text: "ajouter un groupe",
                iconCls: "add",
                handler: function() {
                    this.addCondition('group');
                },
                scope: this
            });
        }
        /*
        if(this.allowSpatial) {
            bar.push({
                text: "spatial",
                iconCls: "add",
                handler: function() {
                    this.addCondition('spatial');
                },
                scope: this
            });
        }*/
        return bar;
    },
    
    /**
     * Method: createEditionToolBar
     */
    createEditionToolBar: function(layer) {
        var createDrawControl = function(handler, controls) {
            var control = new OpenLayers.Control.DrawFeature(layer, handler)
            controls.push(control);
            return control;
        };
        return new Ext.Toolbar({
            items: [
                new GeoExt.Action({
                    control: createDrawControl(OpenLayers.Handler.Point, this.controls),
                    map: this.map,
                    toggleGroup: "querier",
                    tooltip: "Ajouter une condition géographique sur la base d'un point",
                    iconCls: "drawpoint"
                }),
                new GeoExt.Action({
                    control: createDrawControl(OpenLayers.Handler.Path, this.controls),
                    map: this.map,
                    toggleGroup: "querier",
                    tooltip: "Ajouter une condition géographique sur la base d'une ligne",
                    iconCls: "drawline"
                }),
                new GeoExt.Action({
                    control: createDrawControl(OpenLayers.Handler.Polygon, this.controls),
                    map: this.map,
                    toggleGroup: "querier",
                    tooltip: "Ajouter une condition géographique sur la base d'un polygone",
                    iconCls: "drawpolygon"
                })
            ]
        });
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
            filter = this.filter.clone();
            if(filter instanceof OpenLayers.Filter.Logical) {
                filter = this.cleanFilter(filter);
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
                        filter.filters[i] = this.cleanFilter(child)
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
                        var child;
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
                        var child = filter.filters[0];
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
                value: feature.geometry
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
    addCondition: function(conditionType, feature) {
        var filter, type;
        
        var cfg = {
            customizeFilterOnInit: (conditionType == "group") && false,
            listeners: {
                change: function() {
                    this.fireEvent("change", this);
                },
                scope: this
            }
        };
        
        switch (conditionType) {
        case "group":  
            filter = this.wrapFilter(this.createDefaultFilter());
            Ext.apply(cfg, {
                xtype: "gx_filterbuilder",
                filter: filter,
                attributes: this.attributes
            });
            break;
        case "spatial":
            filter = this.createDefaultFilter(feature);
            Ext.apply(cfg, {
                xtype: "gx_spatialfilterpanel",
                filter: filter,
                feature: feature,
                toggleGroup: "querier",
                map: this.map
            });
            break;
        default:
            filter = this.createDefaultFilter();
            Ext.apply(cfg, {
                xtype: "gx_filterpanel",
                filter: filter,
                attributes: this.attributes
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
        if(parent.length > 1) {
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
        var data = new Array(numTypes);
        var type;
        for(var i=0; i<numTypes; ++i) {
            type = types[i];
            data[i] = [type, this.builderTypeNames[type]];
        }
        return {
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
            width: 60 // TODO: move to css
        };
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
            defaults: {border: false}
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
                listeners: {
                    change: function() {
                        this.fireEvent("change", this);
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
        var panel = new Ext.Panel({
            layout: "column",
            defaults: {border: false},
            style: "padding: 0.5em 0.25em;",
            items: [{
                border: false,
                columnWidth: 0.1,
                items: [{
                    xtype: "button",
                    tooltip: "remove condition",
                    cls: 'x-btn-icon',
                    iconCls: "delete",
                    handler: function() {
                        this.removeCondition(panel, filterPanel.filter);
                    },
                    scope: this
                }]
            }, {
                items: [filterPanel],
                border: false,
                columnWidth: 0.9
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
