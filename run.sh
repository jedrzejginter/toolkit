#!/bin/bash -e

npx onchange -v -i -k $1 -- node $1
