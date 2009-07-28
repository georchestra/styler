/**
 * Copyright (c) 2008 The Open Planning Project
 */

/**
 * @include Styler/widgets/FeatureRenderer.js
 * @include Styler/Util.js
 */

Ext.namespace("Styler");
Styler.LegendPanel = Ext.extend(Ext.Panel, {
    
    /**
     * Property: symbolType
     * {String} One of "Point", "Line", or "Polygon".  Default is "Point".
     */
    symbolType: "Point",

    /**
     * Property: rules
     * {Array(OpenLayers.Rule)} List of rules provided in the initial
     *     configuration.
     */
    rules: null,
    
    /**
     * Property: untitledPrefix
     * {String} The prefix to use as a title for rules with no title or
     *     name.  Default is "Untitled ".  Prefix will be appended with a
     *     number.
     */
    untitledPrefix: "Untitled ",
    
    /**
     * Property: clickableSymbol
     * {Boolean} Set cursor style to "pointer" for symbolizers.  Register for
     *     the "symbolclick" event to handle clicks.  Note that click events
     *     are fired regardless of this value.  If false, no cursor style will
     *     be set.  Default is false.
     */
    clickableSymbol: false,
    
    /**
     * Property: clickableTitle
     * {Boolean} Set cursor style to "pointer" for rule titles.  Register for
     *     the "titleclick" event to handle clicks.  Note that click events
     *     are fired regardless of this value.  If false, no cursor style will
     *     be set.  Default is false.
     */
    clickableTitle: false,
    
    /**
     * Property: selectOnClick
     * {Boolean} Set to true if a rule should be selected by clicking on the
     *     symbol or title. Selection will trigger the ruleselected event, and
     *     a click on a selected rule will unselect it and trigger the
     *     ruleunselected event. Default is false.
     */
    selectOnClick: false,
    
    /**
     * Property: enableDD
     * {Boolean} true to enable drag and drop of rules. Default is true.
     */
    enableDD: true,
    
    /**
     * Property: selectedRule
     * {OpenLayers.Rule} The rule that is currently selected
     * (using selectRuleEntry), otherwise null
     */
    selectedRule: null,

    /**
     * Property: untitledCount
     * {Number} Last number used for untitled rule.
     */
    untitledCount: 0,

    initComponent: function() {
        
        var defConfig = {
            plain: true,
            rules: []
        };
        Ext.applyIf(this, defConfig);
        
        this.rulesContainer = new Ext.Panel({
            border: false
        });
        
        this.items = [this.rulesContainer];
        
        this.addEvents(
            /**
             * Event: titleclick
             * Fires when a rule title is clicked.
             *
             * Listener arguments:
             * panel - {Styler.LegendPanel} This panel.
             * rule - {OpenLayers.Rule} The rule whose title was clicked.
             */
            "titleclick", 

            /**
             * Event: symbolclick
             * Fires when a rule symbolizer is clicked.
             *
             * Listener arguments:
             * panel - {Styler.LegendPanel} This panel.
             * rule - {OpenLayers.Rule} The rule whose symbolizer was clicked.
             */
            "symbolclick",

            /**
             * Event: ruleclick
             * Fires when a rule entry is clicked (fired with symbolizer or
             *     title click).
             *
             * Listener arguments:
             * panel - {Styler.LegendPanel} This panel.
             * rule - {OpenLayers.Rule} The rule that was clicked.
             */
            "ruleclick",
            
            /**
             * Event: ruleselected
             * Fires when a rule is clicked and <selectOnClick> is set to true.
             * 
             * Listener arguments:
             * panel - {Styler.LegendPanel This panel.
             * rule - {OpenLayers.Rule} The rule that was unselected.
             */
            "ruleselected",
            
            /**
             * Event: ruleunselected
             * Fires when the selected rule is clicked and <selectOnClick> is
             * set to true, or when a rule is unselected by selecting a
             * different one.
             * 
             * Listener arguments:
             * panel - {Styler.LegendPanel} This panel.
             * rule - {OpenLayers.Rule} The rule that was unselected.
             */
            "ruleunselected",
            
            /**
             * Event: rulemoved
             * Fires when a rule is moved.
             * 
             * Listener arguments:
             * panel - {Styler.LegendPanel} This panel.
             * rule - {OpenLayers.Rule} the rule that was moved.
             */
            "rulemoved"
        ); 
        
        Styler.LegendPanel.superclass.initComponent.call(this);
        this.update();
    },
    
    /**
     * Method: addRuleEntry
     */
    addRuleEntry: function(rule) {
        this.rulesContainer.add(this.createRuleEntry(rule));
    },
    
    /**
     * Method: selectRuleEntry
     */
    selectRuleEntry: function(rule) {
        var newSelection = rule != this.selectedRule;
        if(this.selectedRule) {
            this.unselect();
        }
        if(newSelection) {
            var ruleEntry = this.rulesContainer.items.get(this.rules.indexOf(rule));
            ruleEntry.body.addClass("x-grid3-row-selected");
            this.selectedRule = rule;
            this.fireEvent("ruleselected", this, rule);
        }
    },
    
    /**
     * Method: unselect
     */
    unselect: function() {
        this.rulesContainer.items.each(function(item, i) {
            if(this.rules[i] == this.selectedRule) {
                item.body.removeClass("x-grid3-row-selected");
                this.selectedRule = null;
                this.fireEvent("ruleunselected", this, this.rules[i]);
            }
        }, this);
    },

    /**
     * Method: createRuleEntry
     */
    createRuleEntry: function(rule) {
        var symbolType = Styler.Util.getSymbolTypeFromRule(rule) || 
            (rule[this.symbolType] ? this.symbolType : "Point");
        return {
            xtype: "panel",
            layout: "column",
            border: false,
            bodyStyle: this.selectOnClick ? {cursor: "pointer"} : undefined,
            defaults: {
                border: false
            },
            items: [{
                xtype: "gx_renderer",
                symbolType: symbolType,
                symbolizer: rule.symbolizer[symbolType] || rule.symbolizer,
                style: this.clickableSymbol ? {cursor: "pointer"} : undefined,
                listeners: {
                    click: function() {
                        if(this.clickableSymbol) {
                            this.fireEvent("symbolclick", this, rule);
                            this.fireEvent("ruleclick", this, rule);
                        }
                    },
                    scope: this
                }
            }, {
                cls: "x-form-item",
                style: "padding: 0.2em 0.5em 0;", // TODO: css
                bodyStyle: Ext.applyIf({background: "transparent"}, 
                    this.clickableTitle ? {cursor: "pointer"} : undefined),
                html: this.getRuleTitle(rule),
                listeners: {
                    render: function(comp) {
                        this.clickableTitle && comp.getEl().on({
                            click: function() {
                                this.fireEvent("titleclick", this, rule);
                                this.fireEvent("ruleclick", this, rule);
                            },
                            scope: this
                        });
                    },
                    scope: this
                }
            }],
            listeners: {
                render: function(comp){
                    this.selectOnClick && comp.getEl().on({
                        click: function(comp){
                            this.selectRuleEntry(rule);
                        },
                        scope: this
                    });
                    if(this.enableDD == true) {
                        this.addDD(comp);
                    }
                },
                scope: this
            }
        }
    },
    
    /**
     * Method: addDD
     * Adds drag & drop functionality to a rule entry.
     * 
     * Parameters:
     * component - {Ext.Panel} the rule entry to add drag & drop to
     */
    addDD: function(component) {
        var cursor = component.body.getStyle("cursor");
        var dd = new Ext.Panel.DD(component);
        // restore previous curser (if set). because Panel.DD always
        // sets a move cursor
        component.body.setStyle("cursor", cursor || "move");
        var panel = this;
        var dropZone = new Ext.dd.DropTarget(component.getEl(), {
            notifyDrop: function(ddSource) {
                var source = Ext.getCmp(ddSource.getEl().id);
                var target = Ext.getCmp(this.getEl().id);
                // sometimes, for whatever reason, Ext forgets who the source
                // was, so we make sure that we have one before moving on
                if(source && target && source != target) {
                    var sourceCt = source.ownerCt;
                    var targetCt = target.ownerCt;
                    // only move rules around inside the same container
                    if(sourceCt == targetCt) {
                        panel.moveRule(
                            sourceCt.items.indexOf(source),
                            targetCt.items.indexOf(target)
                        );
                    }
                }
            }
        });
    },
    
    /**
     * Method: update
     * Update rule titles and symbolizers.  This can be made more efficient with
     *     some options to limit what gets updated.
     */
    update: function() {
        if(this.rulesContainer.items) {
            var comp;
            for(var i=this.rulesContainer.items.length-1; i>=0; --i) {
                comp = this.rulesContainer.getComponent(i);
                this.rulesContainer.remove(comp, true);
            }
        }
        var len = this.rules.length;
        var entry;
        for(var i=0; i<len; ++i) {
            this.addRuleEntry(this.rules[i]);
        }
        this.doLayout();
    },
    
    /**
     * Method: moveRule
     */
    moveRule: function(sourcePos, targetPos) {
        var srcRule = this.rules[sourcePos];
        this.rules.splice(sourcePos, 1);
        this.rules.splice(targetPos, 0, srcRule);
        this.update();
        this.fireEvent("rulemoved", this, srcRule);
    },
    
    /**
     * Method: getRuleTitle
     * Return a rule title given a rule.
     *
     * Returns:
     * {String} A title for the rule.
     */
    getRuleTitle: function(rule) {
        return rule.title || rule.name || (this.untitledPrefix + (++this.untitledCount));
    }
    

});

Ext.reg('gx_legendpanel', Styler.LegendPanel); 