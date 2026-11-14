#include <stdio.h>
int main() {
    for (unsigned char C = 126; C < 130; C++)
        printf("%u ", (unsigned)C);
    printf("\n");
}
