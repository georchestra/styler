/**
 * Copyright (c) 2008 The Open Planning Project
 */

/**
 * @requires Styler/widgets/BaseFilterPanel.js
 * @include Styler/widgets/form/ComparisonComboBox.js
 */

Ext.namespace("Styler");
Styler.FilterPanel = Ext.extend(Styler.BaseFilterPanel, {
    
    /**
     * Property: attributes
     * {GeoExt.data.AttributeStore} A configured attributes store for use in
     *     the filter property combo.
     */
    attributes: null,
    
    /**
     * Property: attributesComboConfig
     * {Object}
     */
    attributesComboConfig: null,

    initComponent: function() {
    
        if(!this.attributes) {
            this.attributes = new GeoExt.data.AttributeStore();
        }

        var defAttributesComboConfig = {
            xtype: "combo",
            store: this.attributes,
            editable: false,
            triggerAction: "all",
            hideLabel: true,
            allowBlank: false,
            displayField: "name",
            valueField: "name",
            value: this.filter.property,
            listeners: {
                select: function(combo, record) {
                    this.filter.property = record.get("name");
                    this.fireEvent("change", this.filter);
                },
                scope: this
            },
            width: 120
        };
        this.attributesComboConfig = this.attributesComboConfig || {};
        Ext.applyIf(this.attributesComboConfig, defAttributesComboConfig);
        
        Styler.FilterPanel.superclass.initComponent.call(this);
    },
    
    /**
     * Method: createDefaultFilter
     * May be overridden to change the default filter.
     *
     * Returns:
     * {OpenLayers.Filter} By default, returns a comarison filter.
     */
    createDefaultFilter: function() {
        return new OpenLayers.Filter.Comparison();
    },
    
    /**
     * Method: createFilterItems
     * Creates a panel config containing filter parts.
     */
    createFilterItems: function() {
        
        return [{
            layout: "column",
            border: false,
            defaults: {border: false},
            items: [{
                width: this.attributesComboConfig.width, 
                items: [this.attributesComboConfig]
            }, {
                items: [{
                    xtype: "gx_comparisoncombo",
                    value: this.filter.type,
                    listeners: {
                        select: function(combo, record) {
                            this.filter.type = record.get("value");
                            this.fireEvent("change", this.filter);
                        },
                        scope: this
                    }
                }]
            }, {
                items: [{
                    xtype: "textfield",
                    width: 120,
                    value: this.filter.value,
                    allowBlank: false,
                    listeners: {
                        change: function(el, value) {
                            this.filter.value = value;
                            this.fireEvent("change", this.filter);
                        },
                        scope: this
                    }
                }]
            }]
        }];
    }

});

Ext.reg('gx_filterpanel', Styler.FilterPanel); 
