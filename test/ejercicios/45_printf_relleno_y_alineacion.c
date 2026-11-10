#include <stdio.h>
int main(void) {
    int CERO = 0, POS = 42, NEG = -42;
    printf("[%05d] [%05d] [%05d]\n", CERO, POS, NEG);
    printf("[%-8d] [%-8d]\n", POS, NEG);
    return 0;
}
