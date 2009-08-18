/**
 * Copyright (c) 2009 Camptocamp
 */
 
/**
 * @requires Styler/widgets/BaseFilterPanel.js
 * @include Styler/widgets/form/SpatialComboBox.js
 * @include OpenLayers/Control/ModifyFeature.js
 */
 
Ext.namespace("Styler");
Styler.SpatialFilterPanel = Ext.extend(Styler.BaseFilterPanel, {
    
    /**
     * Property: comboConfig
     * {Object}
     */
    comboConfig: null,
    
    /**
     * Property: feature
     * {OpenLayers.Feature.Vector} feature whose geom is used by this filter
     */
    feature: null,
    
    /**
     * Property: map
     * {OpenLayers.Map} the map object
     */
    map: null,
    
    // workaround an OpenLayers bug when 2 vector layers are involved
    zindex: null,
    
    /**
     * Property: toggleGroup
     * {String} the toggleGroup for the modify feature button
     */
    toggleGroup: null,

    initComponent: function() {
        
        var defComboConfig = {
            xtype: "gx_spatialcombo",
            value: this.filter.type,
            listeners: {
                select: function(combo, record) {
                    this.filter.type = record.get("value");
                    this.fireEvent("change", this.filter);
                },
                scope: this
            },
            width: 120
        };
        this.comboConfig = this.comboConfig || {}; 
        Ext.applyIf(this.comboConfig, defComboConfig);
        
        this.mfControl = new OpenLayers.Control.ModifyFeature(
            this.feature.layer, {
                standalone: true
            }
        );
        this.map.addControl(this.mfControl);
        
        Styler.SpatialFilterPanel.superclass.initComponent.call(this);
    },
    
    /**
     * Method: createDefaultFilter
     * May be overridden to change the default filter.
     *
     * Returns:
     * {OpenLayers.Filter} By default, returns a spatial filter.
     */
    createDefaultFilter: function() {
        return new OpenLayers.Filter.Spatial({
            value: this.feature.geometry
        });
    },
    
    /**
     * Method: tearDown
     * To be run before panel is removed from parent.
     *
     * Returns:
     * {Boolean} By default, true to enable panel removal.
     */
    tearDown: function() {
        this.mfControl.unselectFeature(this.feature);
        this.feature.layer.destroyFeatures([this.feature]);
        return true;
    },
    
    /**
     * Method: createFilterItems
     * Creates a panel config containing filter parts.
     */
    createFilterItems: function() {
        var className = this.feature.geometry.CLASS_NAME;
        var cls = className.substr(className.lastIndexOf('.')+1).toLowerCase();
        return [{
            layout: "column",
            border: false,
            defaults: {border: false},
            items: [{
                width: this.comboConfig.width, 
                items: [this.comboConfig]
            }, {
                items: [{
                    xtype: "button", 
                    iconCls: cls,
                    enableToggle: true,
                    toggleGroup: this.toggleGroup,
                    listeners: {
                        "toggle": function(btn, pressed) {
                            var feature = this.feature;
                            if (pressed) {
                                var geometry = feature.geometry;
                                if (geometry.CLASS_NAME == "OpenLayers.Geometry.Point") {
                                    this.map.setCenter(
                                        geometry.getBounds().getCenterLonLat()
                                    );
                                } else {
                                    this.map.zoomToExtent(
                                        geometry.getBounds().scale(1.05)
                                    );
                                }
                                // zindex hack (might need a rework of the handler feature 's
                                // moveLayerToTop and moveLayerBack methods to manage this)
                                zindex = feature.layer.getZIndex();
                                this.mfControl.activate();
                                this.mfControl.selectFeature(feature);
                                feature.layer.setZIndex(this.map.Z_INDEX_BASE['Feature']+1);
                            } else {
                                this.mfControl.unselectFeature(feature);
                                this.mfControl.deactivate();
                                feature.layer.setZIndex(zindex);
                            }
                        },
                        scope: this
                    }
                }]
            }]
        }];
    }

});

Ext.reg('gx_spatialfilterpanel', Styler.SpatialFilterPanel); 
