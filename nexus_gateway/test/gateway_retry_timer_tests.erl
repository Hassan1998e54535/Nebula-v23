%% SPDX-License-Identifier: Nebula

-module(gateway_retry_timer_tests).
-typing([eqwalizer]).

-include_lib("eunit/include/eunit.hrl").

wait_keeps_unrelated_mailbox_messages_test() ->
    self() ! unrelated_message,
    ?assertEqual(ok, gateway_retry_timer:wait(0)),
    receive
        unrelated_message -> ok
    after 0 ->
        ?assert(false, unrelated_message_was_consumed)
    end.
