var cls = require("./lib/class"),
    Types = require("../../shared/js/gametypes");

// A player's inventory: a fixed number of slots, each empty (null) or
// holding {kind, count}. Healing items stack; weapons and armour take a slot each.
module.exports = Bag = cls.Class.extend({
    init: function(slots) {
        this.slots = [];
        for(var i = 0; i < Types.Inventory.SIZE; i++) {
            this.slots[i] = (slots && slots[i]) || null;
        }
    },

    isStackable: function(kind) {
        return Types.isHealingItem(kind);
    },

    isValidSlot: function(slot) {
        return slot === parseInt(slot) && slot >= 0 && slot < Types.Inventory.SIZE;
    },

    get: function(slot) {
        return this.isValidSlot(slot) ? this.slots[slot] : null;
    },

    // Returns the slot the item would go into, or -1 if the bag is full.
    findSlotFor: function(kind) {
        var i, firstEmpty = -1;

        for(i = 0; i < this.slots.length; i++) {
            var s = this.slots[i];
            if(s === null) {
                if(firstEmpty < 0) {
                    firstEmpty = i;
                }
            } else if(this.isStackable(kind) && s.kind === kind && s.count < Types.Inventory.MAX_STACK) {
                return i;
            }
        }
        return firstEmpty;
    },

    canAdd: function(kind) {
        return Types.isBaggable(kind) && this.findSlotFor(kind) >= 0;
    },

    add: function(kind) {
        var slot = this.canAdd(kind) ? this.findSlotFor(kind) : -1;

        if(slot >= 0) {
            if(this.slots[slot]) {
                this.slots[slot].count += 1;
            } else {
                this.slots[slot] = {kind: kind, count: 1};
            }
        }
        return slot;
    },

    // Removes one item from a slot and returns its kind.
    takeOne: function(slot) {
        var s = this.get(slot);

        if(!s) {
            return null;
        }
        s.count -= 1;
        if(s.count <= 0) {
            this.slots[slot] = null;
        }
        return s.kind;
    },

    // Puts an item into a specific slot, replacing whatever was there.
    put: function(slot, kind) {
        if(this.isValidSlot(slot)) {
            this.slots[slot] = kind ? {kind: kind, count: 1} : null;
        }
    },

    contains: function(kind) {
        return this.slots.some(function(s) { return s !== null && s.kind === kind; });
    },

    // Empties every slot holding this kind.
    removeAll: function(kind) {
        for(var i = 0; i < this.slots.length; i++) {
            if(this.slots[i] && this.slots[i].kind === kind) {
                this.slots[i] = null;
            }
        }
    },

    // Flat list for the INVENTORY message: kind, count for every slot (0, 0 when empty).
    serialize: function() {
        var list = [];
        this.slots.forEach(function(s) {
            list.push(s ? s.kind : 0, s ? s.count : 0);
        });
        return list;
    },

    // Redis stores kinds by name so that renumbering Types.Entities never corrupts saves.
    toJSON: function() {
        return JSON.stringify(this.slots.map(function(s) {
            return s ? [Types.getKindAsString(s.kind), s.count] : null;
        }));
    }
});

Bag.fromJSON = function(json) {
    var slots = [];

    try {
        (JSON.parse(json) || []).forEach(function(entry, i) {
            var kind = entry && Types.getKindFromString(entry[0]),
                count = entry && parseInt(entry[1]);

            if(kind && Types.isBaggable(kind) && count > 0) {
                slots[i] = {kind: kind, count: Math.min(count, Types.Inventory.MAX_STACK)};
            }
        });
    } catch(e) {
        log.error("Could not read saved inventory: " + json);
    }
    return new Bag(slots);
};
