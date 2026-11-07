%% SPDX-License-Identifier: Nebula

-module(gateway_rpc_error).
-typing([eqwalizer]).

-export([raise/1]).

-type reason() :: {gateway_rpc_error, term()}.

-export_type([reason/0]).

-spec raise(term()) -> no_return().
raise(Message) ->
    erlang:error({gateway_rpc_error, Message}).
