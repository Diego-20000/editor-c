#include <stdio.h>
int main() {
    char MAYUS = 'D';
    char MINUS = MAYUS + ('a' - 'A');
    printf("%c %c\n", MAYUS, MINUS);
}
