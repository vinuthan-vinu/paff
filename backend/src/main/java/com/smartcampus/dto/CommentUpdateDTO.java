package com.smartcampus.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CommentUpdateDTO {

    @NotBlank(message = "Comment content is required")
    private String content;
}
