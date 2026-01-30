<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('complaints.{id}', function ($user, $id) {
    \Log::info("Broadcasting Auth Attempt: User {$user->id} for channel complaints.{$id}");
    $complaint = \App\Models\Complaint::find($id);
    if (!$complaint) {
        \Log::warning("Broadcasting Auth Failed: Complaint {$id} not found");
        return false;
    }
    
    $isOwner = (int) $user->id === (int) $complaint->user_id;
    $isAdmin = $user->isAdmin();
    
    \Log::info("Broadcasting Auth Result: User {$user->id}, IsOwner: {$isOwner}, IsAdmin: {$isAdmin}");
    
    return $isOwner || $isAdmin; 
});
