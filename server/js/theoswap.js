var Types = require("../../shared/js/gametypes");

// Reads a player's NFT items from TheoSwap (theoswap.io) and turns them into gear bonuses.
// The player's TheoSwap user code comes from the game link on TheoSwap (?userCode=...).
// Needs "theoswap": {"api_url": ".../api/public/user-items", "api_key": "..."} in the server config.
var TheoSwap = {
    config: null,

    // Highest bonus a single NFT can give, whatever the config on TheoSwap says.
    LIMITS: {speed: 50, attack: 50, defence: 50, health: 500, potions: 99},

    configure: function(config) {
        this.config = config && config.api_url && config.api_key ? config : null;
        if(this.config) {
            log.info("TheoSwap items enabled: " + this.config.api_url);
        }
    },

    isEnabled: function() {
        return this.config !== null;
    },

    isValidCode: function(code) {
        return typeof code === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(code);
    },

    // Calls back with (error, results) where results is the API's list of NFTs and their itemData.
    fetchItems: function(userCode, callback) {
        var url = this.config.api_url +
                (this.config.api_url.indexOf("?") < 0 ? "?" : "&") +
                "apiKey=" + encodeURIComponent(this.config.api_key) +
                "&userCode=" + encodeURIComponent(userCode),
            controller = new AbortController(),
            timer = setTimeout(function() { controller.abort(); }, 8000);

        fetch(url, {signal: controller.signal}).then(function(res) {
            return res.json();
        }).then(function(body) {
            clearTimeout(timer);
            if(!body || !body.status || !Array.isArray(body.results)) {
                callback(new Error((body && body.message) || "Unexpected TheoSwap response"));
            } else {
                callback(null, body.results);
            }
        }).catch(function(err) {
            clearTimeout(timer);
            callback(err);
        });
    },

    // Each NFT unlocks one item. Returns the best NFT for each gear kind,
    // {kind: {speed, attack, defence, health}}, and the potion packs, [{key, count}].
    loadout: function(results) {
        var gear = {},
            potions = [],
            limits = this.LIMITS;

        results.forEach(function(nft) {
            var item = nft && nft.itemData,
                kind = item && Types.TheoSwap.GEAR[item.itemId];

            if(kind) {
                var stats = {
                    speed: clamp(item["Speed Bonus"], limits.speed),
                    attack: clamp(item["Attack Bonus"], limits.attack),
                    defence: clamp(item["Defence Bonus"], limits.defence),
                    health: clamp(item["Health Bonus"], limits.health)
                };
                if(!gear[kind] || total(stats) > total(gear[kind])) {
                    gear[kind] = stats;
                }
            } else if(item && item.itemId === Types.TheoSwap.POTION_PACK) {
                potions.push({
                    key: String(nft.contract).toLowerCase() + ":" + nft.token_id,
                    count: Math.max(1, clamp(item.Quantity, limits.potions))
                });
            }
        });
        return {gear: gear, potions: potions};
    }
};

function clamp(value, max) {
    var n = parseInt(value);
    return n > 0 ? Math.min(n, max) : 0;
}

function total(stats) {
    return stats.speed + stats.attack + stats.defence + stats.health;
}

module.exports = TheoSwap;
