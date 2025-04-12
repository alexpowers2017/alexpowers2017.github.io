$(document).ready(function() {
    $('#city').on('input', function() {
        var query = $(this).val();
        if (query.length > 2) { // Trigger search after 3 characters
            $.ajax({
                url: '/get_cities?query=' + query, // Change URL for use elsewhere
                method: 'GET',
                success: function(data) {
                    // Show suggestions
                    var suggestions = $('#suggestions');
                    suggestions.empty(); // Clear any existing suggestions
                    if (data.length > 0) {
                        data.forEach(function(city) {
                            var suggestionItem = $('<div class="suggestion-item"></div>').text(city);
                            suggestions.append(suggestionItem);
                        });

                        // Add hover effect
                        $('.suggestion-item').on('mouseenter', function() {
                            $(this).addClass('highlighted');
                        }).on('mouseleave', function() {
                            $(this).removeClass('highlighted');
                        });

                        // Handle selection of a suggestion
                        $('.suggestion-item').on('click', function() {
                            var selectedCity = $(this).text();
                            $('#city').val(selectedCity); // Set the input field to the selected city
                            $('#suggestions').empty(); // Clear suggestions after selection
                        });
                    }
                },
                error: function() {
                    $('#suggestions').html('<div>Error fetching cities.</div>');
                }
            });
        } else {
            $('#suggestions').empty(); // Clear suggestions if input is empty
        }
    });

    // Close suggestions if user clicks outside of the input field or suggestions box
    $(document).on('click', function(event) {
        if (!$(event.target).closest('#city, #suggestions').length) {
            $('#suggestions').empty();
        }
    });
});