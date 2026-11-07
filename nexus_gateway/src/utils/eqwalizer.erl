%% SPDX-License-Identifier: Nebula

-module(eqwalizer).
-compile(nowarn_redefined_builtin_type).
-typing([eqwalizer]).

-export([dynamic_cast/1]).
-export_type([dynamic/0, dynamic/1]).

-type dynamic() :: term().
-type dynamic(T) :: T.

-spec dynamic_cast(term()) -> dynamic().
dynamic_cast(Value) ->
    Value.
