#!/bin/bash

# OKAY! Here's how the OUS Demographic set up works in the Azores nearshore reports:
# 1. Run this script from top level folder to create json: 
#    ./data/bin/ousDemographicPrep.sh
# 2. cd data
# 3. Run this script from data folder: 
#    bin/genFgb.sh dist/ous_demographics.json dist ous_demographics 'SELECT * FROM azoresAnonymizedShapes' -explodeCollections
# 4. cd ..
# 5. Run this script to publish json and fgb to aws:
#    ./data/bin/ousDemographicPublish.sh
# 6. Run this script to precalculate demographics data overlap:
#    npx ts-node data/bin/ousDemographicPrecalc.ts


# Pares down OUS demographic data (copied from Data Products) to what reports need
# and saves into data/dist/ous_demographics.json for use in precalc 

# Delete old merged geojson since ogr2ogr can't overwrite it
rm data/src/Analytics/nearshore_reports/OUS_Demographics/ous_demographics.geojson

# Join the number_of_ppl attribute from resp csv to the merged shapes
ogr2ogr -sql "select azoresAnonymizedShapes.anonymous_id as resp_id, azoresAnonymizedShapes.gear_comm as gear, azoresAnonymizedShapes.island as island, azoresAnonymizedShapes.weight as weight, azoresAnonymizedShapes.sector as sector, azoresAnonymizedShapes.n_rep as number_of_ppl from azoresAnonymizedShapes" data/src/Analytics/nearshore_reports/OUS_Demographics/ous_demographics.geojson data/src/Analytics/nearshore_reports/OUS_Demographics/anonymizedShapes.geojson

# Delete old dist files in prep for new
rm data/dist/ous_demographics.json
rm data/dist/ous_demographics.fgb

# Sort by respondent_id (for faster processing at runtime)
npx ts-node data/bin/ousDemographicSort.ts

# Create json file for direct import by precalc
cp data/src/Analytics/nearshore_reports/OUS_Demographics/ous_demographics_sorted.geojson data/dist/ous_demographics.json
