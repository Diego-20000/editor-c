#include <stdio.h>

int main()
{
    printf("[%*d]\n", 6, 42);
    printf("[%*d]\n", -6, 42);
    printf("[%-*d]\n", 8, 42);

    printf("[%.*f]\n", 3, 3.14159);
    printf("[%.*f]\n", 0, 3.14159);
    printf("[%.*f]\n", -1, 3.14159);
}
