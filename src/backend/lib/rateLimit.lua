-- Returns 1 if allowed, 0 if not
local key                   = KEYS[1]
local max                   = tonumber(ARGV[1])
local refillIntervalSeconds = tonumber(ARGV[2])
local cost                  = tonumber(ARGV[3])
local now                   = tonumber(ARGV[4]) -- Current unix time in seconds

local fields = redis.call("HGETALL", key)

if #fields == 0 then
	local expiresInSeconds = cost * refillIntervalSeconds
	redis.call("HSET", key, "count", max - cost, "refilled_at", now)
	redis.call("EXPIRE", key, expiresInSeconds)
	return {1}
end

local count = 0
local refilledAt = 0
for i = 1, #fields, 2 do
	if fields[i] == "count" then
		count = tonumber(fields[i+1])
	elseif fields[i] == "refilled_at" then
		refilledAt = tonumber(fields[i+1])
	end
end

local refill = math.floor((now - refilledAt) / refillIntervalSeconds)
count = math.min(count + refill, max)
refilledAt = refilledAt + refill * refillIntervalSeconds

if count < cost then
	return {0}
end

count = count - cost
local expiresInSeconds = (max - count) * refillIntervalSeconds
redis.call("HSET", key, "count", count, "refilled_at", now)
redis.call("EXPIRE", key, expiresInSeconds)
return {1}
